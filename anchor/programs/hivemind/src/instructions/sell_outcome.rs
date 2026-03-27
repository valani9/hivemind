use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Burn};
use crate::state::*;
use crate::constants::*;
use crate::errors::HivemindError;
use crate::events::TradeExecuted;
use crate::math::lmsr;

#[derive(Accounts)]
#[instruction(is_yes: bool, shares: u64, min_refund: u64)]
pub struct SellOutcome<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.paused @ HivemindError::ProtocolPaused,
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Open @ HivemindError::MarketNotOpen,
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        mut,
        seeds = [AGENT_SEED, seller.key().as_ref()],
        bump = agent_profile.bump,
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), seller.key().as_ref()],
        bump = position.bump,
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// Seller's collateral token account (receives refund)
    #[account(
        mut,
        constraint = seller_token_account.mint == vault.mint,
        constraint = seller_token_account.owner == seller.key(),
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// The outcome mint (YES or NO)
    #[account(mut)]
    pub outcome_mint: Account<'info, Mint>,

    /// Seller's outcome token account (burns shares)
    #[account(
        mut,
        constraint = seller_outcome_account.mint == outcome_mint.key(),
        constraint = seller_outcome_account.owner == seller.key(),
    )]
    pub seller_outcome_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<SellOutcome>, is_yes: bool, shares: u64, min_refund: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let market = &ctx.accounts.market;

    require!(shares > 0, HivemindError::ZeroAmount);
    require!(now < market.closes_at, HivemindError::TradingPeriodEnded);

    // Verify seller has enough shares
    let position = &ctx.accounts.position;
    if is_yes {
        require!(position.yes_shares >= shares, HivemindError::InsufficientShares);
    } else {
        require!(position.no_shares >= shares, HivemindError::InsufficientShares);
    }

    // Calculate refund via LMSR
    let gross_refund = if is_yes {
        lmsr::refund_for_sell_yes(market.q_yes, market.q_no, market.liquidity_param_b, shares)
    } else {
        lmsr::refund_for_sell_no(market.q_yes, market.q_no, market.liquidity_param_b, shares)
    };

    // Calculate fee
    let fee = gross_refund
        .checked_mul(ctx.accounts.config.trading_fee_bps as u64)
        .ok_or(HivemindError::MathOverflow)?
        / 10_000;
    let net_refund = gross_refund.checked_sub(fee).ok_or(HivemindError::MathOverflow)?;

    // Slippage protection
    require!(net_refund >= min_refund, HivemindError::SlippageExceeded);

    // Burn outcome tokens from seller
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.outcome_mint.to_account_info(),
                from: ctx.accounts.seller_outcome_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        shares,
    )?;

    // Transfer refund from vault to seller (Market PDA signs)
    let market_id_bytes = ctx.accounts.market.market_id.to_le_bytes();
    let seeds = &[
        MARKET_SEED,
        market_id_bytes.as_ref(),
        &[ctx.accounts.market.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer_seeds,
        ),
        net_refund,
    )?;

    // Update market state
    let market = &mut ctx.accounts.market;
    if is_yes {
        market.q_yes = market.q_yes.checked_sub(shares as i64).ok_or(HivemindError::MathOverflow)?;
    } else {
        market.q_no = market.q_no.checked_sub(shares as i64).ok_or(HivemindError::MathOverflow)?;
    }
    market.total_collateral = market.total_collateral.saturating_sub(gross_refund);
    market.total_volume = market.total_volume.checked_add(gross_refund).ok_or(HivemindError::MathOverflow)?;
    market.fees_collected = market.fees_collected.checked_add(fee).ok_or(HivemindError::MathOverflow)?;

    // Update position
    let position = &mut ctx.accounts.position;
    if is_yes {
        position.yes_shares = position.yes_shares.checked_sub(shares).ok_or(HivemindError::InsufficientShares)?;
    } else {
        position.no_shares = position.no_shares.checked_sub(shares).ok_or(HivemindError::InsufficientShares)?;
    }
    position.total_received = position.total_received.checked_add(net_refund).ok_or(HivemindError::MathOverflow)?;

    // New prices for event
    let new_price_yes = lmsr::lmsr_price_yes(market.q_yes, market.q_no, market.liquidity_param_b);
    let new_price_no = lmsr::lmsr_price_no(market.q_yes, market.q_no, market.liquidity_param_b);

    emit!(TradeExecuted {
        market_id: market.market_id,
        trader: ctx.accounts.seller.key(),
        is_buy: false,
        is_yes,
        shares,
        cost: gross_refund,
        fee,
        new_price_yes,
        new_price_no,
    });

    Ok(())
}
