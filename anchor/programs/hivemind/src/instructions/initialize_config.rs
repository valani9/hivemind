use anchor_lang::prelude::*;
use crate::state::GlobalConfig;
use crate::constants::*;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = GlobalConfig::SIZE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, GlobalConfig>,

    /// CHECK: Treasury wallet to receive fees
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = ctx.accounts.treasury.key();
    config.market_count = 0;
    config.trading_fee_bps = DEFAULT_TRADING_FEE_BPS;
    config.creation_fee_lamports = DEFAULT_CREATION_FEE;
    config.paused = false;
    config.bump = ctx.bumps.config;
    Ok(())
}
