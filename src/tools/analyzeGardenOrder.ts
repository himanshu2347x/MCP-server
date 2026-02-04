import { deadlineCheck } from "./checks/deadline.check.js";
import { liquidityCheck } from "./checks/liquidity.check.js";
import { priceFluctuationCheck } from "./checks/priceFluctuation.check.js";



export async function analyzeGardenOrder({
  order_id,
}: {
  order_id: string;
}) {
  // 1. Run deadline check
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

const result = await liquidityCheck(order_id);

if (result.matched) {
  return {
    status: "diagnosed",
    order_id,
    reason_code: result.reason_code,
    summary: result.summary,
    evidence: result.evidence,
  };
  } 
  
   const priceResult = await priceFluctuationCheck(order_id);

  if (priceResult.matched) {
    return {
      status: "diagnosed",
      order_id,
      reason_code: priceResult.reason_code,
      summary: priceResult.summary,
      evidence: priceResult.evidence,
    };
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
