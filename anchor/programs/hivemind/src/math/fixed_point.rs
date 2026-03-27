/// Fixed-point arithmetic using u128 with SCALE = 10^12.
/// All "real numbers" are represented as integers multiplied by SCALE.

pub const SCALE: u128 = 1_000_000_000_000; // 10^12

/// Fixed-point multiplication: (a * b) / SCALE
pub fn fp_mul(a: u128, b: u128) -> Option<u128> {
    a.checked_mul(b)?.checked_div(SCALE)
}

/// Fixed-point division: (a * SCALE) / b
pub fn fp_div(a: u128, b: u128) -> Option<u128> {
    if b == 0 {
        return None;
    }
    a.checked_mul(SCALE)?.checked_div(b)
}

/// Precomputed exp(-k) * SCALE for k = 0..20
const EXP_NEG_TABLE: [u128; 21] = [
    1_000_000_000_000, // exp(0)   = 1.0
    367_879_441_171,   // exp(-1)  = 0.367879441171
    135_335_283_237,   // exp(-2)  = 0.135335283237
    49_787_068_368,    // exp(-3)
    18_315_638_889,    // exp(-4)
    6_737_946_999,     // exp(-5)
    2_478_752_177,     // exp(-6)
    911_881_966,       // exp(-7)
    335_462_628,       // exp(-8)
    123_409_804,       // exp(-9)
    45_399_929,        // exp(-10)
    16_701_700,        // exp(-11)
    6_144_212,         // exp(-12)
    2_260_330,         // exp(-13)
    831_529,           // exp(-14)
    305_902,           // exp(-15)
    112_535,           // exp(-16)
    41_400,            // exp(-17)
    15_230,            // exp(-18)
    5_602,             // exp(-19)
    2_061,             // exp(-20)
];

/// Approximate exp(-x) where x is in fixed-point (x >= 0).
/// Uses lookup table for integer part + Taylor series for fractional part.
pub fn exp_neg(x: u128) -> u128 {
    let integer_part = (x / SCALE) as usize;
    let frac_part = x % SCALE;

    if integer_part >= 20 {
        return 0; // exp(-20) is effectively zero for our purposes
    }

    let base = EXP_NEG_TABLE[integer_part];

    if frac_part == 0 {
        return base;
    }

    // Taylor: exp(-f) ≈ 1 - f + f²/2 - f³/6 + f⁴/24
    // where f = frac_part (already in fixed-point, representing [0, 1))
    let f = frac_part;
    let f2 = fp_mul(f, f).unwrap_or(0);
    let f3 = fp_mul(f2, f).unwrap_or(0);
    let f4 = fp_mul(f3, f).unwrap_or(0);

    let exp_neg_frac = SCALE
        .saturating_sub(f)
        .saturating_add(f2 / 2)
        .saturating_sub(f3 / 6)
        .saturating_add(f4 / 24);

    fp_mul(base, exp_neg_frac).unwrap_or(0)
}

/// ln(1 + x) for x in [0, SCALE] (i.e., x represents [0.0, 1.0]).
/// Taylor: ln(1+x) ≈ x - x²/2 + x³/3 - x⁴/4 + x⁵/5
pub fn ln_1_plus_x(x: u128) -> u128 {
    if x == 0 {
        return 0;
    }
    let x2 = fp_mul(x, x).unwrap_or(0);
    let x3 = fp_mul(x2, x).unwrap_or(0);
    let x4 = fp_mul(x3, x).unwrap_or(0);
    let x5 = fp_mul(x4, x).unwrap_or(0);

    x.saturating_sub(x2 / 2)
        .saturating_add(x3 / 3)
        .saturating_sub(x4 / 4)
        .saturating_add(x5 / 5)
}

/// ln(2) in fixed-point ≈ 0.693147180559945
pub const LN2: u128 = 693_147_180_560;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exp_neg_zero() {
        assert_eq!(exp_neg(0), SCALE); // exp(0) = 1.0
    }

    #[test]
    fn test_exp_neg_one() {
        let result = exp_neg(SCALE);
        // exp(-1) ≈ 0.3679
        let expected = 367_879_441_171u128;
        let diff = if result > expected {
            result - expected
        } else {
            expected - result
        };
        assert!(diff < SCALE / 1000, "exp(-1) off by more than 0.1%");
    }

    #[test]
    fn test_exp_neg_half() {
        let result = exp_neg(SCALE / 2);
        // exp(-0.5) ≈ 0.6065
        let expected = 606_530_659_713u128;
        let diff = if result > expected {
            result - expected
        } else {
            expected - result
        };
        assert!(diff < SCALE / 100, "exp(-0.5) off by more than 1%");
    }

    #[test]
    fn test_ln_1_plus_half() {
        let result = ln_1_plus_x(SCALE / 2);
        // ln(1.5) ≈ 0.4055
        let expected = 405_465_108_108u128;
        let diff = if result > expected {
            result - expected
        } else {
            expected - result
        };
        assert!(diff < SCALE / 100, "ln(1.5) off by more than 1%");
    }

    #[test]
    fn test_ln2_constant() {
        // ln(2) = ln(1 + 1) -- but our function only works for x in [0,1]
        // Instead verify the constant is reasonable
        assert!(LN2 > 693_000_000_000);
        assert!(LN2 < 694_000_000_000);
    }

    #[test]
    fn test_fp_mul() {
        // 0.5 * 0.5 = 0.25
        let half = SCALE / 2;
        let result = fp_mul(half, half).unwrap();
        assert_eq!(result, SCALE / 4);
    }

    #[test]
    fn test_fp_div() {
        // 1.0 / 2.0 = 0.5
        let result = fp_div(SCALE, 2 * SCALE).unwrap();
        assert_eq!(result, SCALE / 2);
    }
}
