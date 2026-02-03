// src/tools/analyzeGardenOrder.ts
import fetch from "node-fetch";

export async function analyzeGardenOrder({
  order_id,
}: {
  order_id: string;
}) {
  const res = await fetch(
    `https://api.garden.finance/orders/id/${order_id}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Garden v1 order");
  }

  const data = await res.json() as {
    result: {
      create_order: {
        created_at: string;
        additional_data?: { deadline?: number };
      };
      source_swap: {
        initiate_timestamp?: string;
        required_confirmations: number;
        current_confirmations: number;
      };
    };
  };
  const result = data.result;

  const createOrder = result.create_order;
  const sourceSwap = result.source_swap;

  // timestamps
  const createdAt = new Date(createOrder.created_at);

  const deadlineUnix =
    createOrder.additional_data?.deadline;

  const deadline = deadlineUnix
    ? new Date(deadlineUnix * 1000)
    : null;

  const initiateTimestamp = sourceSwap.initiate_timestamp
    ? new Date(sourceSwap.initiate_timestamp)
    : null;

  // calculations
 let missedDeadline = false;
let delayMinutes: number | null = null;
let reason: string;

if (!initiateTimestamp) {
  missedDeadline = true;
  reason = "User never initiated before deadline";
} else if (deadline && initiateTimestamp > deadline) {
  missedDeadline = true;
  delayMinutes = Math.round(
    (initiateTimestamp.getTime() - deadline.getTime()) / 60000
  );
  reason = "Initiated after deadline";
} else {
  reason = "Initiated within deadline";
}


  // FACTS ONLY
  return {
    order_id,
    created_at: createdAt.toISOString(),
    deadline: deadline ? deadline.toISOString() : null,
    initiate_timestamp: initiateTimestamp
      ? initiateTimestamp.toISOString()
      : null,
    missed_deadline: missedDeadline,
    delay_minutes: delayMinutes,
    required_confirmations: sourceSwap.required_confirmations,
    current_confirmations: sourceSwap.current_confirmations,
  };
}
