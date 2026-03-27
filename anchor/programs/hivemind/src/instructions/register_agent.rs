use anchor_lang::prelude::*;
use crate::state::AgentProfile;
use crate::constants::*;
use crate::errors::HivemindError;
use crate::events::AgentRegistered;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = AgentProfile::SIZE,
        seeds = [AGENT_SEED, owner.key().as_ref()],
        bump,
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterAgent>, name: String) -> Result<()> {
    require!(name.len() <= MAX_AGENT_NAME_LEN, HivemindError::AgentNameTooLong);

    let agent = &mut ctx.accounts.agent_profile;
    agent.owner = ctx.accounts.owner.key();
    agent.name = name.clone();
    agent.registered_at = Clock::get()?.unix_timestamp;
    agent.markets_created = 0;
    agent.markets_traded = 0;
    agent.markets_resolved_correctly = 0;
    agent.total_volume = 0;
    agent.total_pnl = 0;
    agent.accuracy_score = 5000; // Start at 50%
    agent.reputation_score = 5000;
    agent.is_active = true;
    agent.bump = ctx.bumps.agent_profile;

    emit!(AgentRegistered {
        owner: ctx.accounts.owner.key(),
        name,
    });

    Ok(())
}
