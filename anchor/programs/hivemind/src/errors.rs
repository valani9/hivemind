use anchor_lang::prelude::*;

#[error_code]
pub enum HivemindError {
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Market is not open for trading")]
    MarketNotOpen,
    #[msg("Market is not ready for resolution")]
    MarketNotResolvable,
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    #[msg("Market duration too short")]
    DurationTooShort,
    #[msg("Market duration too long")]
    DurationTooLong,
    #[msg("Invalid liquidity parameter")]
    InvalidLiquidityParam,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Trading period has ended")]
    TradingPeriodEnded,
    #[msg("Trading period has not ended yet")]
    TradingPeriodNotEnded,
    #[msg("No winning position to claim")]
    NoWinnings,
    #[msg("Already claimed winnings")]
    AlreadyClaimed,
    #[msg("Insufficient shares to sell")]
    InsufficientShares,
    #[msg("Agent name too long")]
    AgentNameTooLong,
    #[msg("Question text too long")]
    QuestionTooLong,
    #[msg("Category text too long")]
    CategoryTooLong,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Market cannot be cancelled in current state")]
    CannotCancel,
    #[msg("Invalid market outcome")]
    InvalidOutcome,
    #[msg("Agent is not active")]
    AgentNotActive,
}
