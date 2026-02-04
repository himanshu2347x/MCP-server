import fetch from "node-fetch";

export async function deadlineCheck(order_id: string) {
  // 1. Fetch Garden v1 order
  const res = await fetch(
    `https://api.garden.finance/orders/id/${order_id}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Garden v1 order");
  }

  const data = (await res.json()) as {
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

  // 2. Normalize timestamps
  const createdAt = new Date(result.create_order.created_at);

  const deadlineUnix =
    result.create_order.additional_data?.deadline;

  const deadline = deadlineUnix
    ? new Date(deadlineUnix * 1000)
    : null;

  const initiateTimestamp = result.source_swap.initiate_timestamp
    ? new Date(result.source_swap.initiate_timestamp)
    : null;

  // 3. Deadline logic
  if (!deadline) {
    return { matched: false };
  }

  if (!initiateTimestamp) {
    return {
      matched: true,
      reason_code: "deadline_missed",
      summary: "User never initiated before deadline",
      evidence: {
        created_at: createdAt.toISOString(),
        deadline: deadline.toISOString(),
        initiate_timestamp: null,
      },
    };
  }

  if (initiateTimestamp > deadline) {
    const delayMinutes = Math.round(
      (initiateTimestamp.getTime() - deadline.getTime()) / 60000
    );

    return {
      matched: true,
      reason_code: "deadline_missed",
      summary: `User initiated ${delayMinutes} minutes after deadline`,
      evidence: {
        created_at: createdAt.toISOString(),
        deadline: deadline.toISOString(),
        initiate_timestamp: initiateTimestamp.toISOString(),
        delay_minutes: delayMinutes,
      },
    };
  }

  return { matched: false };
}
