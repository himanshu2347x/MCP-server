import { CheckResult, GardenOrderV1 } from "../../types/types.js";

export async function blacklistedCheck(
  orderV1: GardenOrderV1
): Promise<CheckResult> {
  const isBlacklisted = orderV1.create_order.additional_data?.is_blacklisted;

  if (!isBlacklisted) {
    return { matched: false };
  }

  return {
    matched: true,
    reason_code: "user_blacklisted",
    summary: "User address is blacklisted and cannot participate in orders",
    evidence: {
      is_blacklisted: true,
      created_at: orderV1.create_order.created_at,
    },
  };
}
