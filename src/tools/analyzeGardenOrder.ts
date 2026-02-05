import fetch from "node-fetch";
import { DiagnosisResult, OrderV2Response } from "../types/types.js";
import { determineStatus } from "../utils/orderStatus.js";
import { amountMismatchCheck } from "./checks/amountMismatch.check.js";
import { deadlineCheck } from "./checks/deadline.check.js";
import { liquidityCheck } from "./checks/liquidity.check.js";
import { priceFluctuationCheck } from "./checks/priceFluctuation.check.js";

// Helper: Calculate completion time (destination initiate - source initiate)
function calculateCompletionTime(order: OrderV2Response["result"]): string | undefined {
  const sourceInitiate = order.source_swap?.initiate_timestamp;
  const destInitiate = order.destination_swap?.initiate_timestamp;

  if (!sourceInitiate || !destInitiate) return undefined;

  try {
    const durationMs = new Date(destInitiate).getTime() - new Date(sourceInitiate).getTime();
    if (durationMs < 0) return undefined;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  } catch {
    return undefined;
  }
}

// Main diagnosis engine
export async function analyzeGardenOrder({
  order_id,
}: {
  order_id: string;
}): Promise<DiagnosisResult> {
  // Step 1: Fetch V2 order data FIRST (required)
  const orderV2Res = await fetch(`https://api.garden.finance/v2/orders/${order_id}`);
  if (!orderV2Res.ok) {
    throw new Error("Failed to fetch Garden v2 order");
  }
  const orderV2Json = await orderV2Res.json() as OrderV2Response;
  const order = orderV2Json.result;

  // Step 2: Determine status using V2 lifecycle fields ONLY
  const status = determineStatus(order);

  // Step 3: Handle different statuses with appropriate checks

  // NOT STARTED: No diagnosis needed
  if (status === "not_started") {
    return {
      status: "not_started",
      order_id,
      summary: "Order has not been initiated by the user yet",
    };
  }

  // PENDING: No failure diagnosis, just report status
  if (status === "pending") {
    return {
      status: "pending",
      order_id,
      summary: "Order is in progress and awaiting redeem",
    };
  }

  // FAILED: Run checks sequentially with early exit
  if (status === "failed") {
    // Check 1: Deadline
    const deadlineResult = await deadlineCheck(order_id);
    if (deadlineResult.matched && deadlineResult.summary) {
      return {
        status: "failed",
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
        status: "failed",
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
        status: "failed",
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
        status: "failed",
        order_id,
        reason_code: priceResult.reason_code,
        summary: priceResult.summary,
        evidence: priceResult.evidence,
      };
    }

    // No issue detected
    return {
      status: "failed",
      order_id,
      summary: "Order failed with refund executed, but no specific failure pattern detected",
      action: "human_intervention_required",
    };
  }

  // COMPLETED_SUCCESS: Calculate completion time and provide timeline
  if (status === "completed_success") {
    const completionTime = calculateCompletionTime(order);
    
    // Get timestamps for timeline
    const createdAt = order.created_at;
    const sourceInitiate = order.source_swap?.initiate_timestamp;
    const destInitiate = order.destination_swap?.initiate_timestamp;

    // Format timeline if timestamps available
    let timelineDetails = "";
    if (createdAt && sourceInitiate && destInitiate) {
      try {
        const createdDate = new Date(createdAt);
        const sourceInitDate = new Date(sourceInitiate);
        const destInitDate = new Date(destInitiate);

        const sourceDelay = Math.floor((sourceInitDate.getTime() - createdDate.getTime()) / 1000);
        const destDelay = Math.floor((destInitDate.getTime() - createdDate.getTime()) / 1000);

        const dateStr = createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        timelineDetails = `\n\nTimeline on ${dateStr}:\n` +
          `- Order Created: ${createdDate.toTimeString().slice(0, 8)}\n` +
          `- Source Initiated: ${sourceInitDate.toTimeString().slice(0, 8)} (${sourceDelay}s after creation)\n` +
          `- Destination Initiated: ${destInitDate.toTimeString().slice(0, 8)} (${destDelay}s after creation)`;
      } catch {
        // If timestamp parsing fails, skip timeline
      }
    }

    const summary = completionTime
      ? `Transaction completed successfully in ${completionTime}. The order was fully filled on both sides with no delays detected.${timelineDetails}`
      : "Transaction completed successfully. The order was fully filled on both sides.";

    return {
      status: "completed_success",
      order_id,
      summary,
      completion_time: completionTime,
    };
  }

  // Fallback (should never reach here)
  return {
    status: "undetermined",
    order_id,
    summary: "Unable to determine order status",
    action: "human_intervention_required",
  };
}
