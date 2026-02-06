import fetch from "node-fetch";
import { DiagnosisResult, OrderV1Response, OrderV2Response } from "../types/types.js";
import { calculateCompletionTime, formatTimeline } from "../utils/completionTime.js";
import { determineStatus } from "../utils/orderStatus.js";
import { amountMismatchCheck } from "./checks/amountMismatch.check.js";
import { deadlineCheck } from "./checks/deadline.check.js";
import { liquidityCheck } from "./checks/liquidity.check.js";
import { priceFluctuationCheck } from "./checks/priceFluctuation.check.js";

const API_BASE_URL = process.env.GARDEN_API_BASE_URL;

export async function analyzeGardenOrder({
  order_id,
}: {
  order_id: string;
}): Promise<DiagnosisResult> {

  const [orderV2Res, orderV1Res] = await Promise.all([
    fetch(`${API_BASE_URL}/v2/orders/${order_id}`),
    fetch(`${API_BASE_URL}/orders/id/${order_id}`)
  ]);
  
  if (!orderV2Res.ok) {
    throw new Error("Failed to fetch Garden v2 order");
  }
  if (!orderV1Res.ok) {
    throw new Error("Failed to fetch Garden v1 order");
  }
  
  const orderV2Json = await orderV2Res.json() as OrderV2Response;
  const orderV1Json = await orderV1Res.json() as OrderV1Response;
  const order = orderV2Json.result;
  const orderV1 = orderV1Json.result;

  const status = determineStatus(order,orderV1);


  // NOT INITIATED
  if (status === "not_initiated") {
    return {
      status: "not_initiated",
      order_id,
      summary: "Order has not been initiated by the user yet",
    };
  }

  // IN PROGRESS:
  if (status === "in_progress") {
    return {
      status: "in_progress",
      order_id,
      summary: "Order is in progress and awaiting redeem",
    };
  }

  // EXPIRED OR REFUNDED: 
  if (status === "expired" || status === "refunded") {
    // Check 1: Deadline
    const deadlineResult = await deadlineCheck(orderV1);
    if (deadlineResult.matched && deadlineResult.summary) {
      return {
        status,
        order_id,
        reason_code: deadlineResult.reason_code,
        summary: deadlineResult.summary,
        evidence: deadlineResult.evidence,
      };
    }

    // Check 2: Amount mismatch
    const amountResult = await amountMismatchCheck(order);
    if (amountResult.matched && amountResult.summary) {
      return {
        status,
        order_id,
        reason_code: amountResult.reason_code,
        summary: amountResult.summary,
        evidence: amountResult.evidence,
      };
    }

    // Check 3: Liquidity
    const liquidityResult = await liquidityCheck(order);
    if (liquidityResult.matched && liquidityResult.summary) {
      return {
        status,
        order_id,
        reason_code: liquidityResult.reason_code,
        summary: liquidityResult.summary,
        evidence: liquidityResult.evidence,
      };
    }

    // Check 4: Price fluctuation
    const priceResult = await priceFluctuationCheck(order);
    if (priceResult.matched && priceResult.summary) {
      return {
        status,
        order_id,
        reason_code: priceResult.reason_code,
        summary: priceResult.summary,
        evidence: priceResult.evidence,
      };
    }

    const fallbackSummary = status === "expired" 
      ? "Order expired after deadline passed, but no specific failure pattern detected"
      : "Order was refunded, but no specific failure pattern detected";

    return {
      status,
      order_id,
      summary: fallbackSummary,
      action: "human_intervention_required",
    };
  }

  // COMPLETED
  if (status === "completed") {
    const completionTime = calculateCompletionTime(order);
    const timeline = formatTimeline(order);
    
    const summary = `Transaction completed successfully${completionTime ? ` in ${completionTime}` : ''}.${timeline}`;

    return {
      status: "completed",
      order_id,
      summary,
      completion_time: completionTime,
    };
  }

  // Fallback
  return {
    status: "undetermined",
    order_id,
    summary: "Unable to determine order status",
    action: "human_intervention_required",
  };
}
