// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LMSR — Logarithmic Market Scoring Rule library
/// @notice Fixed-point implementation using 1e6 scale for probabilities
///         and 1e18 scale (wei) for collateral amounts.
///         All math uses integer arithmetic only.
library LMSR {
    // ─────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────

    /// @dev 1e6 fixed-point scale for probabilities & shares
    uint256 constant SCALE = 1e6;

    /// @dev ln(2) * SCALE  ≈ 693147
    uint256 constant LN2_SCALED = 693147;

    /// @dev Max argument magnitude we'll accept for exp (prevents overflow)
    int256 constant EXP_MAX = 20 * int256(SCALE); // 20.0 in scaled

    // ─────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────

    /// @notice Initial liquidity subsidy a market creator must deposit.
    ///         Equals b * ln(2) so both outcomes start at 50%.
    /// @param b Liquidity parameter in wei
    function initialSubsidy(uint256 b) internal pure returns (uint256) {
        return (b * LN2_SCALED) / SCALE;
    }

    /// @notice Cost to buy `shares` (in SCALE units) of an outcome.
    /// @param qYes Current YES quantity (SCALE units)
    /// @param qNo  Current NO quantity  (SCALE units)
    /// @param b    Liquidity parameter in wei
    /// @param shares Number of shares to buy (SCALE units)
    /// @param isYes True = buy YES, False = buy NO
    /// @return cost in wei
    function costToBuy(
        int256 qYes,
        int256 qNo,
        uint256 b,
        uint256 shares,
        bool isYes
    ) internal pure returns (uint256) {
        int256 newQYes = isYes ? qYes + int256(shares) : qYes;
        int256 newQNo  = isYes ? qNo  : qNo  + int256(shares);

        uint256 costBefore = _lmsrCost(qYes, qNo, b);
        uint256 costAfter  = _lmsrCost(newQYes, newQNo, b);

        return costAfter > costBefore ? costAfter - costBefore : 0;
    }

    /// @notice Refund for selling `shares` of an outcome.
    function refundForSell(
        int256 qYes,
        int256 qNo,
        uint256 b,
        uint256 shares,
        bool isYes
    ) internal pure returns (uint256) {
        int256 newQYes = isYes ? qYes - int256(shares) : qYes;
        int256 newQNo  = isYes ? qNo  : qNo  - int256(shares);

        uint256 costBefore = _lmsrCost(qYes, qNo, b);
        uint256 costAfter  = _lmsrCost(newQYes, newQNo, b);

        return costBefore > costAfter ? costBefore - costAfter : 0;
    }

    /// @notice Current implied probability of YES in SCALE units (0..1e6).
    function priceYes(int256 qYes, int256 qNo, uint256 b)
        internal pure returns (uint256)
    {
        // P(yes) = exp(qYes/b) / (exp(qYes/b) + exp(qNo/b))
        //        = 1 / (1 + exp((qNo - qYes)/b))
        int256 diff = qNo - qYes; // scaled
        // diff / b in SCALE units
        int256 x = (diff * int256(SCALE)) / int256(b);
        // clamp
        if (x > EXP_MAX)  return 0;
        if (x < -EXP_MAX) return SCALE;

        uint256 expX = _exp(x); // SCALE units
        // p = SCALE^2 / (SCALE + expX)  →  divide by SCALE
        return (SCALE * SCALE) / (SCALE + expX);
    }

    // ─────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────

    /// @dev C(q_yes, q_no) = b * ln(exp(q_yes/b) + exp(q_no/b))
    ///      Uses log-sum-exp trick to avoid overflow:
    ///      = b * (max/b + ln(1 + exp(-|diff|/b)))
    function _lmsrCost(int256 qYes, int256 qNo, uint256 b)
        private pure returns (uint256)
    {
        // Work in SCALE units; b is in wei
        int256 diff = qYes >= qNo ? qYes - qNo : qNo - qYes;

        // diff_scaled = diff / b in SCALE units (diff is SCALE, b is wei; treat b as SCALE here)
        // Actually both qYes/qNo are in SCALE and b is in wei; to get a dimensionless ratio
        // we treat b as SCALE (the user provides b in SCALE-wei-equivalent).
        // For the math to work: x = |diff| / b  (both in same units).
        // We store b in SCALE units internally for the cost curve.
        int256 x;
        if (int256(b) > 0) {
            x = (diff * int256(SCALE)) / int256(b);
        } else {
            x = 0;
        }

        // clamp x
        if (x > EXP_MAX) x = EXP_MAX;

        // ln(1 + exp(-x)) approximation
        uint256 lse; // log-sum-exp term in SCALE
        if (x == 0) {
            lse = LN2_SCALED; // ln(2) * SCALE
        } else {
            uint256 negX = uint256(x); // x is positive now
            uint256 expNegX = _expNeg(negX); // exp(-x) in SCALE
            // ln(1 + exp(-x))
            lse = _ln1p(expNegX); // in SCALE
        }

        // max(qYes, qNo) / b  in SCALE
        int256 maxQ = qYes >= qNo ? qYes : qNo;
        uint256 maxTerm;
        if (int256(b) > 0) {
            // maxQ is in SCALE, b in SCALE → ratio is dimensionless * SCALE
            maxTerm = uint256((maxQ * int256(SCALE)) / int256(b));
        }

        // C = b * (maxTerm/SCALE + lse/SCALE)
        //   = b * (maxTerm + lse) / SCALE
        return (b * (maxTerm + lse)) / SCALE;
    }

    // ─────────────────────────────────────────────────────
    // Math primitives (Taylor series, SCALE = 1e6)
    // ─────────────────────────────────────────────────────

    /// @dev exp(x) for x in [-EXP_MAX, EXP_MAX], result in SCALE.
    ///      Uses: exp(x) = exp(floor(x)) * exp(frac(x))
    ///      Lookup table for integer part, Taylor for fractional.
    function _exp(int256 x) private pure returns (uint256) {
        bool negative = x < 0;
        uint256 ax = negative ? uint256(-x) : uint256(x);

        // Split into integer and fractional parts (SCALE = 1e6)
        uint256 intPart  = ax / SCALE;
        uint256 fracPart = ax % SCALE;

        // exp of fractional part via 6-term Taylor: 1 + f + f^2/2 + f^3/6 + f^4/24 + f^5/120
        uint256 f  = fracPart; // in SCALE
        uint256 f2 = (f * f) / SCALE;
        uint256 f3 = (f2 * f) / SCALE;
        uint256 f4 = (f3 * f) / SCALE;
        uint256 f5 = (f4 * f) / SCALE;
        uint256 expFrac = SCALE + f + f2/2 + f3/6 + f4/24 + f5/120;

        // exp of integer part via lookup (precomputed e^k * SCALE)
        uint256 expInt = _expIntLookup(intPart);

        // Combine
        uint256 result = (expInt * expFrac) / SCALE;

        if (negative) {
            // exp(-x) = SCALE^2 / exp(x)
            return result > 0 ? (SCALE * SCALE) / result : type(uint256).max;
        }
        return result;
    }

    /// @dev exp(-x) for x >= 0, result in SCALE.
    function _expNeg(uint256 x) private pure returns (uint256) {
        uint256 intPart  = x / SCALE;
        uint256 fracPart = x % SCALE;

        uint256 f  = fracPart;
        uint256 f2 = (f * f) / SCALE;
        uint256 f3 = (f2 * f) / SCALE;
        uint256 f4 = (f3 * f) / SCALE;
        uint256 f5 = (f4 * f) / SCALE;
        uint256 expFrac = SCALE + f + f2/2 + f3/6 + f4/24 + f5/120;

        uint256 expInt = _expIntLookup(intPart);
        uint256 expPosX = (expInt * expFrac) / SCALE;

        return expPosX > 0 ? (SCALE * SCALE) / expPosX : 0;
    }

    /// @dev ln(1 + x) for x in [0, SCALE], result in SCALE.
    ///      Uses 6-term Taylor: x - x^2/2 + x^3/3 - x^4/4 + x^5/5 - x^6/6
    function _ln1p(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        if (x >= SCALE) return LN2_SCALED; // ln(2) for x = 1

        uint256 x2 = (x * x) / SCALE;
        uint256 x3 = (x2 * x) / SCALE;
        uint256 x4 = (x3 * x) / SCALE;
        uint256 x5 = (x4 * x) / SCALE;
        uint256 x6 = (x5 * x) / SCALE;

        // Alternating series: converges for |x| <= 1
        uint256 pos = x + x3/3 + x5/5;
        uint256 neg = x2/2 + x4/4 + x6/6;
        return pos > neg ? pos - neg : 0;
    }

    /// @dev Lookup table: e^k * SCALE for k = 0..20
    function _expIntLookup(uint256 k) private pure returns (uint256) {
        // e^0=1, e^1≈2.718, e^2≈7.389, ..., e^20≈485165195.4
        // All values * 1e6
        if (k == 0)  return 1_000_000;
        if (k == 1)  return 2_718_282;
        if (k == 2)  return 7_389_056;
        if (k == 3)  return 20_085_537;
        if (k == 4)  return 54_598_150;
        if (k == 5)  return 148_413_159;
        if (k == 6)  return 403_428_793;
        if (k == 7)  return 1_096_633_158;
        if (k == 8)  return 2_980_957_987;
        if (k == 9)  return 8_103_083_928;
        if (k == 10) return 22_026_465_795;
        if (k == 11) return 59_874_141_715;
        if (k == 12) return 162_754_791_419;
        if (k == 13) return 442_413_392_391;
        if (k == 14) return 1_202_604_284_165;
        if (k == 15) return 3_269_446_579_480;
        if (k == 16) return 8_886_110_520_508;
        if (k == 17) return 24_154_952_753_575;
        if (k == 18) return 65_659_969_137_331;
        if (k == 19) return 178_482_300_963_187;
        if (k == 20) return 485_165_195_409_790;
        return type(uint256).max; // overflow sentinel
    }
}
