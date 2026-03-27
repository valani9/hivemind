use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::HivemindError;
use crate::events::MarketCancelled;

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = authority.key() == config.authority @ HivemindError::Unauthorized,
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [MARKET_SEED, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Open || market.status == MarketStatus::Closed
            @ HivemindError::CannotCancel,
    )]
    pub market: Box<Account<'info, Market>>,
}

pub fn handler(ctx: Context<CancelMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.status = MarketStatus::Cancelled;
    market.outcome = MarketOutcome::Invalid;

    emit!(MarketCancelled {
        market_id: market.market_id,
    });

    Ok(())
}
