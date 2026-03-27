use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use crate::state::*;
use crate::constants::*;
use crate::errors::HivemindError;
use crate::events::TradeExecuted;
use crate::math::lmsr;
use crate::math::fixed_point::SCALE;

#[derive(Accounts)]
#[instruction(is_yes: bool, shares: u64, max_cost: u64)]
pub struct BuyOutcome<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

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
        seeds = [AGENT_SEED, buyer.key().as_ref()],
        bump = agent_profile.bump,
    )]
    pub agent_profile: Box<Account<'info, AgentProfile>>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = Position::SIZE,
        seeds = [POSITION_SEED, market.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// Buyer's collateral token account
    #[account(
        mut,
        constraint = buyer_token_account.mint == vault.mint,
        constraint = buyer_token_account.owner == buyer.key(),
    )]
    pub buyer_token_account: Box<Account<'info, TokenAccount>>,

    /// The outcome mint (YES or NO) to mint shares from
    #[account(mut)]
    pub outcome_mint: Box<Account<'info, Mint>>,

    /// Buyer's outcome token account to receive minted shares
    #[account(
        mut,
        constraint = buyer_outcome_account.mint == outcome_mint.key(),
        constraint = buyer_outcome_account.owner == buyer.key(),
    )]
    pub buyer_outcome_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuyOutcome>, is_yes: bool, shares: u64, max_cost: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let market = &ctx.accounts.market;

    require!(shares > 0, HivemindError::ZeroAmount);
    require!(now < market.closes_at, HivemindError::TradingPeriodEnded);

    // Calculate cost via LMSR
    let cost = if is_yes {
        lmsr::cost_to_buy_yes(market.q_yes, market.q_no, market.liquidity_param_b, shares)
    } else {
        lmsr::cost_to_buy_no(market.q_yes, market.q_no, market.liquidity_param_b, shares)
    };

    // Calculate fee
    let fee = cost
        .checked_mul(ctx.accounts.config.trading_fee_bps as u64)
        .ok_or(HivemindError::MathOverflow)?
        / 10_000;
    let total_payment = cost.checked_add(fee).ok_or(HivemindError::MathOverflow)?;

    // Slippage protection
    require!(total_payment <= max_cost, HivemindError::SlippageExceeded);
    require!(
        ctx.accounts.buyer_token_account.amount >= total_payment,
        HivemindError::InsufficientCollateral
    );

    // Transfer collateral to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        total_payment,
    )?;

    // Mint outcome tokens to buyer (Market PDA is mint authority)
    let market_id_bytes = ctx.accounts.market.market_id.to_le_bytes();
    let seeds = &[
        MARKET_SEED,
        market_id_bytes.as_ref(),
        &[ctx.accounts.market.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.outcome_mint.to_account_info(),
                to: ctx.accounts.buyer_outcome_account.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer_seeds,
        ),
        shares,
    )?;

    // Cache keys before mutable borrows
    let market_key = ctx.accounts.market.key();
    let buyer_key = ctx.accounts.buyer.key();
    let position_bump = ctx.bumps.position;

    // Update position (complete all position work in one block)
    {
        let position = &mut ctx.accounts.position;
        let is_new = position.agent == Pubkey::default();
        if is_new {
            position.agent = buyer_key;
            position.market = market_key;
            position.bump = position_bump;
        }
        if is_yes {
            position.yes_shares = position.yes_shares.checked_add(shares).ok_or(HivemindError::MathOverflow)?;
        } else {
            position.no_shares = position.no_shares.checked_add(shares).ok_or(HivemindError::MathOverflow)?;
        }
        position.total_cost_basis = position.total_cost_basis.checked_add(cost).ok_or(HivemindError::MathOverflow)?;
    }

    // Check if this was a new position (re-read since borrow ended)
    let is_new = ctx.accounts.position.agent == buyer_key
        && ctx.accounts.position.yes_shares.checked_add(ctx.accounts.position.no_shares).unwrap_or(0) == shares;

    // Update market state
    let market = &mut ctx.accounts.market;
    if is_yes {
        market.q_yes = market.q_yes.checked_add(shares as i64).ok_or(HivemindError::MathOverflow)?;
    } else {
        market.q_no = market.q_no.checked_add(shares as i64).ok_or(HivemindError::MathOverflow)?;
    }
    market.total_collateral = market.total_collateral.checked_add(cost).ok_or(HivemindError::MathOverflow)?;
    market.total_volume = market.total_volume.checked_add(cost).ok_or(HivemindError::MathOverflow)?;
    market.fees_collected = market.fees_collected.checked_add(fee).ok_or(HivemindError::MathOverflow)?;
    if is_new {
        market.num_traders = market.num_traders.checked_add(1).ok_or(HivemindError::MathOverflow)?;
    }

    // Update agent stats
    let agent = &mut ctx.accounts.agent_profile;
    agent.total_volume = agent.total_volume.checked_add(cost).ok_or(HivemindError::MathOverflow)?;
    if is_new {
        agent.markets_traded = agent.markets_traded.checked_add(1).ok_or(HivemindError::MathOverflow)?;
    }

    // Calculate new prices for event
    let new_price_yes = lmsr::lmsr_price_yes(ctx.accounts.market.q_yes, ctx.accounts.market.q_no, ctx.accounts.market.liquidity_param_b);
    let new_price_no = lmsr::lmsr_price_no(ctx.accounts.market.q_yes, ctx.accounts.market.q_no, ctx.accounts.market.liquidity_param_b);

    emit!(TradeExecuted {
        market_id: ctx.accounts.market.market_id,
        trader: buyer_key,
        is_buy: true,
        is_yes,
        shares,
        cost,
        fee,
        new_price_yes,
        new_price_no,
    });

    Ok(())
}
