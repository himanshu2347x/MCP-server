import { GardenOrderV2 } from "../../types/types.js";
import { fetchCurrentPrices } from "../../utils/priceFluctuation/fetchCurrentPrices.js";
import { validatePriceThreshold } from "../../utils/priceFluctuation/validatePriceThreshold.js";

export async function priceFluctuationCheck(order: GardenOrderV2) {

  const sourceSwap = order.source_swap;
  const destinationSwap = order.destination_swap;

  if (!sourceSwap || !destinationSwap) {
    return { matched: false };
  }

  const originalInputPrice = sourceSwap.asset_price;
  const originalOutputPrice = destinationSwap.asset_price;

  if (
    typeof originalInputPrice !== "number" ||
    typeof originalOutputPrice !== "number"
  ) {
    return { matched: false };
  }


  const [currentInputPrice, currentOutputPrice] =
    await fetchCurrentPrices(
      sourceSwap.asset,
      destinationSwap.asset
    );

  const priceRatio =
    currentInputPrice / currentOutputPrice;

  if (Math.abs(priceRatio - 1.0) < 0.005) {
    return { matched: false };
  }

  const PRICE_DROP_THRESHOLD = 0.05; // 5%

  const withinThreshold =
    validatePriceThreshold(
      originalInputPrice,
      originalOutputPrice,
      currentInputPrice,
      currentOutputPrice,
      PRICE_DROP_THRESHOLD
    );

  if (!withinThreshold) {
    return {
      matched: true,
      reason_code: "price_fluctuation_exceeded",
      summary:
        "Market prices moved beyond the allowed threshold since order creation",
      evidence: {
        original_input_price: originalInputPrice,
        original_output_price: originalOutputPrice,
        current_input_price: currentInputPrice,
        current_output_price: currentOutputPrice,
        threshold: PRICE_DROP_THRESHOLD,
      },
    };
  }

  return { matched: false };
}
