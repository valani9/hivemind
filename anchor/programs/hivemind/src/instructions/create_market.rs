use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::*;
use crate::constants::*;
use crate::errors::HivemindError;
use crate::events::MarketCreated;
use crate::math::lmsr;

#[derive(Accounts)]
#[instruction(
    question: String,
    category: String,
    closes_at: i64,
    resolves_at: i64,
    liquidity_param_b: u64,
)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.paused @ HivemindError::ProtocolPaused,
    )]
    pub config: Box<Account<'info, GlobalConfig>>,

    #[account(
        mut,
        seeds = [AGENT_SEED, creator.key().as_ref()],
        bump = agent_profile.bump,
        constraint = agent_profile.is_active @ HivemindError::AgentNotActive,
    )]
    pub agent_profile: Box<Account<'info, AgentProfile>>,

    #[account(
        init,
        payer = creator,
        space = Market::SIZE,
        seeds = [MARKET_SEED, config.market_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub market: Box<Account<'info, Market>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    question: String,
    category: String,
    closes_at: i64,
    resolves_at: i64,
    liquidity_param_b: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    require!(question.len() <= 128, HivemindError::QuestionTooLong);
    require!(category.len() <= 32, HivemindError::CategoryTooLong);
    require!(closes_at > now + MIN_MARKET_DURATION, HivemindError::DurationTooShort);
    require!(closes_at < now + MAX_MARKET_DURATION, HivemindError::DurationTooLong);
    require!(resolves_at >= closes_at, HivemindError::DurationTooShort);
    require!(
        liquidity_param_b >= MIN_LIQUIDITY_PARAM && liquidity_param_b <= MAX_LIQUIDITY_PARAM,
        HivemindError::InvalidLiquidityParam
    );

    let market = &mut ctx.accounts.market;
    let config = &mut ctx.accounts.config;

    market.market_id = config.market_count;
    market.creator = ctx.accounts.creator.key();

    let hash = anchor_lang::solana_program::hash::hash(question.as_bytes());
    market.question_hash = hash.to_bytes();

    market.q_yes = 0;
    market.q_no = 0;
    market.liquidity_param_b = liquidity_param_b;
    market.created_at = now;
    market.closes_at = closes_at;
    market.resolves_at = resolves_at;
    market.resolved_at = 0;
    market.outcome = MarketOutcome::Unresolved;
    market.status = MarketStatus::Open;
    market.resolver = Pubkey::default();
    market.total_collateral = 0;
    market.total_volume = 0;
    market.num_traders = 0;
    market.fees_collected = 0;
    market.bump = ctx.bumps.market;
    market.vault_bump = 0;
    market.yes_mint_bump = 0;
    market.no_mint_bump = 0;

    config.market_count = config.market_count.checked_add(1).ok_or(HivemindError::MathOverflow)?;

    let agent = &mut ctx.accounts.agent_profile;
    agent.markets_created = agent.markets_created.checked_add(1).ok_or(HivemindError::MathOverflow)?;

    emit!(MarketCreated {
        market_id: market.market_id,
        creator: market.creator,
        question,
        category,
        closes_at,
        liquidity_param_b,
    });

    Ok(())
}
