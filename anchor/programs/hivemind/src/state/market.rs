use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MarketStatus {
    Open,
    Closed,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MarketOutcome {
    Unresolved,
    Yes,
    No,
    Invalid,
}

/// Market account -- uses zero_copy for fixed layout to minimize stack usage
#[account]
pub struct Market {
    pub market_id: u64,
    pub creator: Pubkey,
    // Question stored as hash -- full text off-chain
    pub question_hash: [u8; 32],

    // LMSR state
    pub q_yes: i64,
    pub q_no: i64,
    pub liquidity_param_b: u64,

    // Timing
    pub created_at: i64,
    pub closes_at: i64,
    pub resolves_at: i64,
    pub resolved_at: i64,

    // Resolution
    pub outcome: MarketOutcome,
    pub status: MarketStatus,
    pub resolver: Pubkey,

    // Accounting
    pub total_collateral: u64,
    pub total_volume: u64,
    pub num_traders: u32,
    pub fees_collected: u64,

    // Bumps
    pub bump: u8,
    pub vault_bump: u8,
    pub yes_mint_bump: u8,
    pub no_mint_bump: u8,
}

impl Market {
    pub const SIZE: usize = 8  // discriminator
        + 8   // market_id
        + 32  // creator
        + 32  // question_hash
        + 8   // q_yes
        + 8   // q_no
        + 8   // liquidity_param_b
        + 8   // created_at
        + 8   // closes_at
        + 8   // resolves_at
        + 8   // resolved_at
        + 1   // outcome
        + 1   // status
        + 32  // resolver
        + 8   // total_collateral
        + 8   // total_volume
        + 4   // num_traders
        + 8   // fees_collected
        + 1 + 1 + 1 + 1; // bumps
    // Total: 8 + 196 = 204 bytes
}
