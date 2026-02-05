import { GardenOrderV1, GardenOrderV2, OrderStatus } from "../types/types.js";

export function safeBigInt(value: string | undefined | null): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

export function determineStatus(order: GardenOrderV2, orderV1: GardenOrderV1): OrderStatus {
  const source = order.source_swap;
  const dest = order.destination_swap;

    
  if (source?.redeem_tx_hash && dest?.redeem_tx_hash) {
    return "completed";
  }

  if (source?.refund_tx_hash || dest?.refund_tx_hash) {
    return "refunded";
  }

  if (!source?.initiate_tx_hash && !dest?.initiate_tx_hash) {
    return "not_initiated";
  }

  const deadlineUnix = orderV1.create_order.additional_data?.deadline;
  if (deadlineUnix) {
    const deadline = new Date(deadlineUnix * 1000);
    const now = new Date();
    if (now > deadline) {
      return "expired";
    }
  }

  return "in_progress";
}
