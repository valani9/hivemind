use anchor_lang::prelude::*;

#[account]
pub struct AgentProfile {
    pub owner: Pubkey,
    pub name: String,
    pub registered_at: i64,
    pub markets_created: u32,
    pub markets_traded: u32,
    pub markets_resolved_correctly: u32,
    pub total_volume: u64,
    pub total_pnl: i64,
    pub accuracy_score: u32, // 0-10000 basis points
    pub reputation_score: u32,
    pub is_active: bool,
    pub bump: u8,
}

impl AgentProfile {
    pub const SIZE: usize = 8 // discriminator
        + 32  // owner
        + (4 + 64) // name
        + 8   // registered_at
        + 4   // markets_created
        + 4   // markets_traded
        + 4   // markets_resolved_correctly
        + 8   // total_volume
        + 8   // total_pnl
        + 4   // accuracy_score
        + 4   // reputation_score
        + 1   // is_active
        + 1;  // bump
    // Total: 8 + 32 + 68 + 8 + 4*3 + 8*2 + 4*2 + 2 = 154 bytes
}
