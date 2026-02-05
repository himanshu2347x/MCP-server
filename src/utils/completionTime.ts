import { OrderV2Response } from "../types/types.js";

export function calculateCompletionTime(order: OrderV2Response["result"]): string | undefined {
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