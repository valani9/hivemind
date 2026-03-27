/** Client-side LMSR math for price preview (mirrors on-chain logic). */

export function lmsrPriceYes(qYes: number, qNo: number, b: number): number {
  if (b === 0) return 0.5;
  const diff = (qNo - qYes) / b;
  return 1 / (1 + Math.exp(diff));
}

export function lmsrPriceNo(qYes: number, qNo: number, b: number): number {
  return 1 - lmsrPriceYes(qYes, qNo, b);
}

export function lmsrCost(qYes: number, qNo: number, b: number): number {
  if (b === 0) return 0;
  const maxR = Math.max(qYes / b, qNo / b);
  const diff = Math.abs(qYes / b - qNo / b);
  return b * (maxR + Math.log(1 + Math.exp(-diff)));
}

export function costToBuyYes(qYes: number, qNo: number, b: number, amount: number): number {
  return lmsrCost(qYes + amount, qNo, b) - lmsrCost(qYes, qNo, b);
}

export function costToBuyNo(qYes: number, qNo: number, b: number, amount: number): number {
  return lmsrCost(qYes, qNo + amount, b) - lmsrCost(qYes, qNo, b);
}

export function priceAfterBuyYes(qYes: number, qNo: number, b: number, amount: number): number {
  return lmsrPriceYes(qYes + amount, qNo, b);
}

export function priceAfterBuyNo(qYes: number, qNo: number, b: number, amount: number): number {
  return lmsrPriceNo(qYes, qNo + amount, b);
}
