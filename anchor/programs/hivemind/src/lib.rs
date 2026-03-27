use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;

use instructions::*;

declare_id!("EYabocTLpbU9jtVbBKBRAgym2WxzuQqrLyQpLRWYf6t2");

#[program]
pub mod hivemind {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        instructions::initialize_config::handler(ctx)
    }

    pub fn register_agent(ctx: Context<RegisterAgent>, name: String) -> Result<()> {
        instructions::register_agent::handler(ctx, name)
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        question: String,
        category: String,
        closes_at: i64,
        resolves_at: i64,
        liquidity_param_b: u64,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, question, category, closes_at, resolves_at, liquidity_param_b)
    }

    pub fn buy_outcome(
        ctx: Context<BuyOutcome>,
        is_yes: bool,
        shares: u64,
        max_cost: u64,
    ) -> Result<()> {
        instructions::buy_outcome::handler(ctx, is_yes, shares, max_cost)
    }

    pub fn sell_outcome(
        ctx: Context<SellOutcome>,
        is_yes: bool,
        shares: u64,
        min_refund: u64,
    ) -> Result<()> {
        instructions::sell_outcome::handler(ctx, is_yes, shares, min_refund)
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: u8) -> Result<()> {
        instructions::resolve_market::handler(ctx, outcome)
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        instructions::cancel_market::handler(ctx)
    }
}
