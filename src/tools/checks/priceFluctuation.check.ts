import fetch from "node-fetch";
import { fetchCurrentPrices } from "../../utils/priceFluctuation/fetchCurrentPrices.js";
import { validatePriceThreshold } from "../../utils/priceFluctuation/validatePriceThreshold.js";

export async function priceFluctuationCheck(order_id: string) {
  /* 1. Fetch order (v2) */
  const res = await fetch(
    `https://api.garden.finance/v2/orders/${order_id}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Garden v2 order");
  }

  const orderJson = (await res.json()) as any;
  const order = orderJson.result;

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

  /* 2. Fetch current fiat prices */
  const [currentInputPrice, currentOutputPrice] =
    await fetchCurrentPrices(
      sourceSwap.asset,
      destinationSwap.asset
    );

  /* 3. Skip likewise assets (±0.5%) */
  const priceRatio =
    currentInputPrice / currentOutputPrice;

  if (Math.abs(priceRatio - 1.0) < 0.005) {
    return { matched: false };
  }

  /* 4. Validate threshold */
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
