import fetch from "node-fetch";
import { OrderV2Response } from "../types/types.js";
import { amountMismatchCheck } from "./checks/amountMismatch.check.js";
import { deadlineCheck } from "./checks/deadline.check.js";
import { liquidityCheck } from "./checks/liquidity.check.js";
import { priceFluctuationCheck } from "./checks/priceFluctuation.check.js";


export async function analyzeGardenOrder({
  order_id,
}: {
  order_id: string;
}) {
  // Run deadline check first - uses v1 route and saves v2 API call if matched
  const deadlineResult = await deadlineCheck(order_id);
  if (deadlineResult.matched) {
    return {
      status: "diagnosed",
      order_id,
      reason_code: deadlineResult.reason_code,
      summary: deadlineResult.summary,
      evidence: deadlineResult.evidence,
    };
  }

  const orderV2Res = await fetch(`https://api.garden.finance/v2/orders/${order_id}`);
  if (!orderV2Res.ok) {
    throw new Error("Failed to fetch Garden v2 order");
  }
  const orderV2Json = await orderV2Res.json() as OrderV2Response;
  const order = orderV2Json.result;

  // Run checks sequentially with early exit on first match

  const amountResult = await amountMismatchCheck(order);
  if (amountResult.matched) {
    return {
      status: "diagnosed",
      order_id,
      reason_code: amountResult.reason_code,
      summary: amountResult.summary,
      evidence: amountResult.evidence,
    };
  }

  const liquidityResult = await liquidityCheck(order);
  if (liquidityResult.matched) {
    return {
      status: "diagnosed",
      order_id,
      reason_code: liquidityResult.reason_code,
      summary: liquidityResult.summary,
      evidence: liquidityResult.evidence,
    };
  }

  const priceResult = await priceFluctuationCheck(order);
  if (priceResult.matched) {
    return {
      status: "diagnosed",
      order_id,
      reason_code: priceResult.reason_code,
      summary: priceResult.summary,
      evidence: priceResult.evidence,
    };
  }

  // Fallback (no checks matched)
  return {
    status: "undetermined",
    order_id,
    summary:
      "No known automated failure pattern matched for this order",
    action: "human_intervention_required",
  };
}
