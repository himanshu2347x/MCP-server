import { GardenOrderV1 } from "../../types/types.js";

export async function deadlineCheck(orderV1: GardenOrderV1) {

  const result = orderV1;

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
