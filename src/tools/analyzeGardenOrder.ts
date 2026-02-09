import fetch from "node-fetch";
import { DiagnosisResult, OrderV1Response, OrderV2Response } from "../types/types.js";
import { calculateCompletionTime, formatTimeline } from "../utils/completionTime.js";
import { determineStatus } from "../utils/orderStatus.js";
import { amountMismatchCheck } from "./checks/amountMismatch.check.js";
import { blacklistedCheck } from "./checks/blacklisted.check.js";
import { deadlineCheck } from "./checks/deadline.check.js";
import { liquidityCheck } from "./checks/liquidity.check.js";
import { priceFluctuationCheck } from "./checks/priceFluctuation.check.js";

const API_BASE_URL = process.env.GARDEN_API_BASE_URL;

// Type guard function for CheckResult
function isMatched(result: { matched: boolean }): result is {
  matched: true;
  reason_code: string;
  summary: string;
  evidence?: Record<string, any>
} {
  return result.matched === true;
}

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

  // Check if order is blacklisted first
  const blacklistedResult = await blacklistedCheck(orderV1);
  if (blacklistedResult.matched) {
    return {
      status: "blacklisted",
      order_id,
      reason_code: blacklistedResult.reason_code,
      summary: blacklistedResult.summary,
      evidence: blacklistedResult.evidence,
    };
  }

  // NOT INITIATED
  if (status === "not_initiated") {
    return {
      status: "not_initiated",
      order_id,
      summary: "Order has not been initiated by the user yet",
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



  // EXPIRED, REFUNDED OR IN_PROGRESS: 
  if (status === "expired" || status === "refunded" || status === "in_progress") {
    const results = await Promise.all([
      deadlineCheck(orderV1),
      amountMismatchCheck(order),
      liquidityCheck(order),
      priceFluctuationCheck(order),
    ]);

    const matched = results.find(isMatched);
    if (matched) {
      return {
        status,
        order_id,
        reason_code: matched.reason_code,
        summary: matched.summary,
        evidence: matched.evidence,
      };
    }

    const fallbackSummary = status === "expired" 
      ? "Order expired after deadline passed, but no specific failure pattern detected"
      : status === "refunded"
        ? "Order was refunded, but no specific failure pattern detected"
        : "Order is in progress, but no specific failure pattern detected";

    return {
      status,
      order_id,
      summary: fallbackSummary,
      action: "human_intervention_required",
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
