use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::HivemindError;
use crate::events::MarketResolved;

#[derive(Accounts)]
#[instruction(outcome: u8)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Box<Account<'info, Market>>,
}

pub fn handler(ctx: Context<ResolveMarket>, outcome: u8) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let market = &ctx.accounts.market;

    // Only authority can resolve
    require!(
        ctx.accounts.resolver.key() == ctx.accounts.config.authority,
        HivemindError::Unauthorized
    );

    // Market must be open or closed (past closes_at)
    require!(
        market.status == MarketStatus::Open || market.status == MarketStatus::Closed,
        HivemindError::MarketNotResolvable
    );

    // Must be past closes_at
    require!(now >= market.closes_at, HivemindError::TradingPeriodNotEnded);

    // Validate outcome: 1 = Yes, 2 = No, 3 = Invalid
    let market_outcome = match outcome {
        1 => MarketOutcome::Yes,
        2 => MarketOutcome::No,
        3 => MarketOutcome::Invalid,
        _ => return Err(HivemindError::InvalidOutcome.into()),
    };

    let market = &mut ctx.accounts.market;
    market.outcome = market_outcome;
    market.status = MarketStatus::Resolved;
    market.resolved_at = now;
    market.resolver = ctx.accounts.resolver.key();

    emit!(MarketResolved {
        market_id: market.market_id,
        outcome,
        resolver: ctx.accounts.resolver.key(),
        resolved_at: now,
    });

    Ok(())
}
