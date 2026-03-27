use anchor_lang::prelude::*;

#[event]
pub struct MarketCreated {
    pub market_id: u64,
    pub creator: Pubkey,
    pub question: String,
    pub category: String,
    pub closes_at: i64,
    pub liquidity_param_b: u64,
}

#[event]
pub struct TradeExecuted {
    pub market_id: u64,
    pub trader: Pubkey,
    pub is_buy: bool,
    pub is_yes: bool,
    pub shares: u64,
    pub cost: u64,
    pub fee: u64,
    pub new_price_yes: u64,
    pub new_price_no: u64,
}

#[event]
pub struct MarketResolved {
    pub market_id: u64,
    pub outcome: u8,
    pub resolver: Pubkey,
    pub resolved_at: i64,
}

#[event]
pub struct WinningsClaimed {
    pub market_id: u64,
    pub agent: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AgentRegistered {
    pub owner: Pubkey,
    pub name: String,
}

#[event]
pub struct MarketCancelled {
    pub market_id: u64,
}
