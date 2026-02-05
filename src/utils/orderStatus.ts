import { GardenOrderV2, OrderStatus } from "../types/types.js";

export function safeBigInt(value: string | undefined | null): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

export function determineStatus(order: GardenOrderV2): OrderStatus {
  const source = order.source_swap;
  const dest = order.destination_swap;

  if (!source?.initiate_tx_hash && !dest?.initiate_tx_hash) {
    return "not_started";
  }

  if (source?.refund_tx_hash || dest?.refund_tx_hash) {
    return "failed";
  }

  if (source?.redeem_tx_hash && dest?.redeem_tx_hash) {
    return "completed_success";
  }

  return "pending";
}
