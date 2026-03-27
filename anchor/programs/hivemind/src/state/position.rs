use anchor_lang::prelude::*;

#[account]
pub struct Position {
    pub agent: Pubkey,
    pub market: Pubkey,
    pub yes_shares: u64,
    pub no_shares: u64,
    pub total_cost_basis: u64,
    pub total_received: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl Position {
    pub const SIZE: usize = 8 // discriminator
        + 32  // agent
        + 32  // market
        + 8   // yes_shares
        + 8   // no_shares
        + 8   // total_cost_basis
        + 8   // total_received
        + 1   // claimed
        + 1;  // bump
    // Total: 106 bytes
}
