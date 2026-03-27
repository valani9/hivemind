pub const CONFIG_SEED: &[u8] = b"config";
pub const MARKET_SEED: &[u8] = b"market";
pub const VAULT_SEED: &[u8] = b"vault";
pub const AGENT_SEED: &[u8] = b"agent";
pub const POSITION_SEED: &[u8] = b"position";
pub const YES_MINT_SEED: &[u8] = b"yes_mint";
pub const NO_MINT_SEED: &[u8] = b"no_mint";

pub const MAX_QUESTION_LEN: usize = 256;
pub const MAX_CATEGORY_LEN: usize = 64;
pub const MAX_AGENT_NAME_LEN: usize = 64;

pub const MIN_MARKET_DURATION: i64 = 300; // 5 minutes
pub const MAX_MARKET_DURATION: i64 = 31_536_000; // 1 year

pub const DEFAULT_TRADING_FEE_BPS: u16 = 50; // 0.5%
pub const DEFAULT_CREATION_FEE: u64 = 10_000_000; // 0.01 SOL

pub const MIN_LIQUIDITY_PARAM: u64 = 10_000_000; // 0.01 SOL
pub const MAX_LIQUIDITY_PARAM: u64 = 100_000_000_000; // 100 SOL
