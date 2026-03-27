/// LMSR (Logarithmic Market Scoring Rule) implementation.
///
/// Cost function: C(q) = b * ln(exp(q_yes/b) + exp(q_no/b))
/// Using log-sum-exp trick for numerical stability:
///   C(q) = b * [max(q_yes/b, q_no/b) + ln(1 + exp(-|q_yes/b - q_no/b|))]
///
/// Price function (sigmoid):
///   P(yes) = 1 / (1 + exp((q_no - q_yes) / b))

use super::fixed_point::*;

/// Compute the LMSR cost function C(q_yes, q_no, b).
/// All inputs are in lamports (u64). Returns cost in lamports.
pub fn lmsr_cost(q_yes: i64, q_no: i64, b: u64) -> u64 {
    if b == 0 {
        return 0;
    }
    let b128 = b as u128;

    // Compute q_yes/b and q_no/b in fixed-point
    let ratio_yes: i128 = (q_yes as i128) * (SCALE as i128) / (b128 as i128);
    let ratio_no: i128 = (q_no as i128) * (SCALE as i128) / (b128 as i128);

    let max_ratio = ratio_yes.max(ratio_no);
    let diff = (ratio_yes - ratio_no).unsigned_abs() as u128;

    // exp(-|diff|)
    let exp_neg_diff = exp_neg(diff);

    // ln(1 + exp(-|diff|))
    let ln_term = ln_1_plus_x(exp_neg_diff);

    // C = b * (max_ratio + ln_term)
    // max_ratio is signed fixed-point, ln_term is unsigned fixed-point
    let cost_fp: i128 = max_ratio + (ln_term as i128);
    let cost = (b128 as i128) * cost_fp / (SCALE as i128);

    cost.max(0) as u64
}

/// Price of YES outcome (0 to SCALE).
/// P(yes) = 1 / (1 + exp((q_no - q_yes) / b))
/// = exp((q_yes - q_no) / b) / (1 + exp((q_yes - q_no) / b))
pub fn lmsr_price_yes(q_yes: i64, q_no: i64, b: u64) -> u64 {
    if b == 0 {
        return SCALE as u64 / 2; // 50%
    }

    // diff = (q_no - q_yes) / b in fixed-point
    let diff_raw: i128 = (q_no as i128 - q_yes as i128) * (SCALE as i128) / (b as i128);

    if diff_raw >= 0 {
        // q_no >= q_yes, price <= 0.5
        // P = exp(-diff) / (1 + exp(-diff))
        let exp_val = exp_neg(diff_raw as u128);
        let denom = SCALE + exp_val;
        if denom == 0 {
            return 0;
        }
        ((exp_val * SCALE) / denom) as u64
    } else {
        // q_yes > q_no, price > 0.5
        // P = 1 / (1 + exp(|diff|))  but diff is negative so exp(diff) = exp(-|diff|)
        let abs_diff = (-diff_raw) as u128;
        let exp_val = exp_neg(abs_diff);
        let denom = SCALE + exp_val;
        if denom == 0 {
            return SCALE as u64;
        }
        ((SCALE * SCALE) / denom) as u64
    }
}

/// Price of NO outcome (0 to SCALE). Always = SCALE - price_yes.
pub fn lmsr_price_no(q_yes: i64, q_no: i64, b: u64) -> u64 {
    let yes_price = lmsr_price_yes(q_yes, q_no, b);
    (SCALE as u64).saturating_sub(yes_price)
}

/// Cost to buy `amount` YES shares.
/// delta_cost = C(q_yes + amount, q_no, b) - C(q_yes, q_no, b)
pub fn cost_to_buy_yes(q_yes: i64, q_no: i64, b: u64, amount: u64) -> u64 {
    let cost_after = lmsr_cost(
        q_yes.checked_add(amount as i64).unwrap_or(i64::MAX),
        q_no,
        b,
    );
    let cost_before = lmsr_cost(q_yes, q_no, b);
    cost_after.saturating_sub(cost_before)
}

/// Cost to buy `amount` NO shares.
pub fn cost_to_buy_no(q_yes: i64, q_no: i64, b: u64, amount: u64) -> u64 {
    let cost_after = lmsr_cost(
        q_yes,
        q_no.checked_add(amount as i64).unwrap_or(i64::MAX),
        b,
    );
    let cost_before = lmsr_cost(q_yes, q_no, b);
    cost_after.saturating_sub(cost_before)
}

/// Refund for selling `amount` YES shares.
pub fn refund_for_sell_yes(q_yes: i64, q_no: i64, b: u64, amount: u64) -> u64 {
    let cost_before = lmsr_cost(q_yes, q_no, b);
    let cost_after = lmsr_cost(
        q_yes.checked_sub(amount as i64).unwrap_or(0),
        q_no,
        b,
    );
    cost_before.saturating_sub(cost_after)
}

/// Refund for selling `amount` NO shares.
pub fn refund_for_sell_no(q_yes: i64, q_no: i64, b: u64, amount: u64) -> u64 {
    let cost_before = lmsr_cost(q_yes, q_no, b);
    let cost_after = lmsr_cost(
        q_yes,
        q_no.checked_sub(amount as i64).unwrap_or(0),
        b,
    );
    cost_before.saturating_sub(cost_after)
}

/// Calculate the initial liquidity subsidy needed: b * ln(2)
pub fn initial_subsidy(b: u64) -> u64 {
    let result = (b as u128) * LN2 / SCALE;
    result as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    const B: u64 = 1_000_000_000; // 1 SOL as liquidity param

    #[test]
    fn test_initial_price_is_fifty_fifty() {
        // With q_yes = 0 and q_no = 0, price should be 0.5
        let price = lmsr_price_yes(0, 0, B);
        let half = SCALE as u64 / 2;
        let diff = if price > half { price - half } else { half - price };
        assert!(diff < SCALE as u64 / 100, "Initial price should be ~50%");
    }

    #[test]
    fn test_prices_sum_to_one() {
        let yes_price = lmsr_price_yes(500_000_000, 200_000_000, B);
        let no_price = lmsr_price_no(500_000_000, 200_000_000, B);
        let sum = yes_price as u128 + no_price as u128;
        let diff = if sum > SCALE { sum - SCALE } else { SCALE - sum };
        assert!(diff < SCALE / 100, "Prices should sum to ~1.0");
    }

    #[test]
    fn test_buying_yes_increases_price() {
        let price_before = lmsr_price_yes(0, 0, B);
        let price_after = lmsr_price_yes(100_000_000, 0, B);
        assert!(
            price_after > price_before,
            "Buying YES should increase YES price"
        );
    }

    #[test]
    fn test_cost_to_buy_is_positive() {
        let cost = cost_to_buy_yes(0, 0, B, 100_000_000);
        assert!(cost > 0, "Cost to buy should be positive");
    }

    #[test]
    fn test_sell_refund_less_than_buy_cost() {
        // Buy then sell same amount should result in a small loss (the spread)
        let amount = 100_000_000u64;
        let buy_cost = cost_to_buy_yes(0, 0, B, amount);
        let sell_refund = refund_for_sell_yes(amount as i64, 0, B, amount);
        // Sell refund should approximately equal buy cost for same state
        let diff = if buy_cost > sell_refund {
            buy_cost - sell_refund
        } else {
            sell_refund - buy_cost
        };
        assert!(
            diff < buy_cost / 10,
            "Round-trip cost should be small"
        );
    }

    #[test]
    fn test_initial_subsidy() {
        let subsidy = initial_subsidy(B);
        // b * ln(2) ≈ 1 SOL * 0.693 ≈ 0.693 SOL
        assert!(subsidy > 600_000_000, "Subsidy should be > 0.6 SOL");
        assert!(subsidy < 800_000_000, "Subsidy should be < 0.8 SOL");
    }

    #[test]
    fn test_extreme_yes_price_approaches_one() {
        // If lots of YES shares bought, price should approach 1.0
        let price = lmsr_price_yes(10_000_000_000, 0, B);
        assert!(
            price > (SCALE as u64 * 99 / 100),
            "Price should be > 99% with heavy YES buying"
        );
    }
}
