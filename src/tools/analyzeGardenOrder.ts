import fetch from "node-fetch";
import { FiatPricesResponse, LiquidityResponse, OrderV1Response, OrderV2Response } from "../types/types.js";
import { amountMismatchCheck } from "./checks/amountMismatch.check.js";
import { deadlineCheck } from "./checks/deadline.check.js";
import { liquidityCheck } from "./checks/liquidity.check.js";
import { priceFluctuationCheck } from "./checks/priceFluctuation.check.js";


export async function analyzeGardenOrder({
  order_id,
}: {
  order_id: string;
}) {
  // Fetch all data in parallel for maximum speed
  const [orderV2Res, orderV1Res, liquidityRes, fiatRes] = await Promise.all([
    fetch(`https://api.garden.finance/v2/orders/${order_id}`),
    fetch(`https://api.garden.finance/orders/id/${order_id}`),
    fetch("https://api.garden.finance/v2/liquidity"),
    fetch("https://api.garden.finance/v2/fiat"),
  ]);

  // Check if all requests were successful
  if (!orderV2Res.ok) {
    throw new Error("Failed to fetch Garden v2 order");
  }
  if (!orderV1Res.ok) {
    throw new Error("Failed to fetch Garden v1 order");
  }
  if (!liquidityRes.ok) {
    throw new Error("Failed to fetch Garden liquidity");
  }
  if (!fiatRes.ok) {
    throw new Error("Failed to fetch fiat prices");
  }

  // Parse all responses
  const [orderV2Json, orderV1Json, liquidityJson, fiatJson] = await Promise.all([
    orderV2Res.json() as Promise<OrderV2Response>,
    orderV1Res.json() as Promise<OrderV1Response>,
    liquidityRes.json() as Promise<LiquidityResponse>,
    fiatRes.json() as Promise<FiatPricesResponse>,
  ]);

  const order = orderV2Json.result;
  const orderV1Data = orderV1Json.result;
  const liquidityData = liquidityJson;
  const fiatPrices = fiatJson.result;



  const CHECKS = [
  {
    name: "deadline",
    run: () => deadlineCheck(orderV1Data),
  },
  {
    name: "amount_mismatch",
    run: () => amountMismatchCheck(order),
  },
  {
    name: "liquidity",
    run: () => liquidityCheck(order, liquidityData),
  },
  {
    name: "price_fluctuation",
    run: () => priceFluctuationCheck(order, fiatPrices),
  },
];


for (const check of CHECKS) {
  const result = await check.run();

  if (result.matched) {
    return {
      status: "diagnosed",
      order_id,
      reason_code: result.reason_code,
      summary: result.summary,
      evidence: result.evidence,
    };
  }
}


  // 2. Fallback (no checks matched)
  return {
    status: "undetermined",
    order_id,
    summary:
      "No known automated failure pattern matched for this order",
    action: "human_intervention_required",
  };
}
