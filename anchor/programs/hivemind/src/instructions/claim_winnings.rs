use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Burn};
use crate::state::*;
use crate::constants::*;
use crate::errors::HivemindError;
use crate::events::WinningsClaimed;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Resolved @ HivemindError::MarketNotResolvable,
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        mut,
        seeds = [AGENT_SEED, claimant.key().as_ref()],
        bump = agent_profile.bump,
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), claimant.key().as_ref()],
        bump = position.bump,
        constraint = !position.claimed @ HivemindError::AlreadyClaimed,
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// Claimant's collateral token account (receives payout)
    #[account(
        mut,
        constraint = claimant_token_account.mint == vault.mint,
        constraint = claimant_token_account.owner == claimant.key(),
    )]
    pub claimant_token_account: Account<'info, TokenAccount>,

    /// The winning outcome token mint
    #[account(mut)]
    pub winning_mint: Account<'info, Mint>,

    /// Claimant's winning outcome token account (to burn)
    #[account(
        mut,
        constraint = claimant_outcome_account.mint == winning_mint.key(),
        constraint = claimant_outcome_account.owner == claimant.key(),
    )]
    pub claimant_outcome_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &ctx.accounts.position;

    // Determine winning shares based on outcome
    let winning_shares = match market.outcome {
        MarketOutcome::Yes => position.yes_shares,
        MarketOutcome::No => position.no_shares,
        MarketOutcome::Invalid => {
            // Invalid outcome: refund cost basis proportionally
            // For simplicity, refund based on total shares held
            position.yes_shares.saturating_add(position.no_shares)
        }
        MarketOutcome::Unresolved => return Err(HivemindError::MarketNotResolvable.into()),
    };

    require!(winning_shares > 0, HivemindError::NoWinnings);

    // Payout: each winning share is worth 1 unit of collateral (lamport)
    // This is the fundamental LMSR property
    let payout = winning_shares;

    // Ensure vault has enough
    let vault_balance = ctx.accounts.vault.amount;
    let actual_payout = payout.min(vault_balance);

    // Burn winning tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.winning_mint.to_account_info(),
                from: ctx.accounts.claimant_outcome_account.to_account_info(),
                authority: ctx.accounts.claimant.to_account_info(),
            },
        ),
        winning_shares,
    )?;

    // Transfer payout from vault (Market PDA signs)
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
                to: ctx.accounts.claimant_token_account.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer_seeds,
        ),
        actual_payout,
    )?;

    // Update position
    let position = &mut ctx.accounts.position;
    position.claimed = true;

    // Update agent stats
    let agent = &mut ctx.accounts.agent_profile;
    let market = &ctx.accounts.market;

    // Check if agent predicted correctly (had shares on winning side)
    let predicted_correctly = match market.outcome {
        MarketOutcome::Yes => position.yes_shares > 0,
        MarketOutcome::No => position.no_shares > 0,
        _ => false,
    };

    if predicted_correctly {
        agent.markets_resolved_correctly = agent
            .markets_resolved_correctly
            .checked_add(1)
            .unwrap_or(agent.markets_resolved_correctly);
    }

    // Update P&L: payout - cost_basis
    let pnl_delta = actual_payout as i64 - position.total_cost_basis as i64;
    agent.total_pnl = agent.total_pnl.saturating_add(pnl_delta);

    // Recalculate accuracy score (basis points)
    if agent.markets_traded > 0 {
        agent.accuracy_score = ((agent.markets_resolved_correctly as u64) * 10_000
            / (agent.markets_traded as u64)) as u32;
    }

    emit!(WinningsClaimed {
        market_id: market.market_id,
        agent: ctx.accounts.claimant.key(),
        amount: actual_payout,
    });

    Ok(())
}
