export function validatePriceThreshold(
  originalInputPrice: number,
  originalOutputPrice: number,
  currentInputPrice: number,
  currentOutputPrice: number,
  priceDropThreshold: number
): boolean {
  if (
    originalInputPrice <= 0 ||
    originalOutputPrice <= 0
  ) {
    return false;
  }

  const inputPriceDecrease =
    (originalInputPrice - currentInputPrice) /
    originalInputPrice;

  const outputPriceIncrease =
    (currentOutputPrice - originalOutputPrice) /
    originalOutputPrice;

  const combinedSystemLoss =
    inputPriceDecrease + outputPriceIncrease;

  const userValueProtection =
    currentOutputPrice >=
    originalOutputPrice * (1 - priceDropThreshold);

  const systemValueProtection =
    combinedSystemLoss <= priceDropThreshold;

  return userValueProtection && systemValueProtection;
}