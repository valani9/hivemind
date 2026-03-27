use anchor_lang::prelude::*;

#[account]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub market_count: u64,
    pub trading_fee_bps: u16,
    pub creation_fee_lamports: u64,
    pub paused: bool,
    pub bump: u8,
}

impl GlobalConfig {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 2 + 8 + 1 + 1; // 92
}
