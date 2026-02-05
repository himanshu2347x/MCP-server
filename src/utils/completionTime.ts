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

export function formatTimeline(order: OrderV2Response["result"]): string {
  const createdAt = order.created_at;
  const sourceInitiate = order.source_swap?.initiate_timestamp;
  const destInitiate = order.destination_swap?.initiate_timestamp;

  if (!createdAt || !sourceInitiate || !destInitiate) return "";

  try {
    const created = new Date(createdAt);
    const sourceInit = new Date(sourceInitiate);
    const destInit = new Date(destInitiate);

    const sourceDelay = Math.floor((sourceInit.getTime() - created.getTime()) / 1000);
    const destDelay = Math.floor((destInit.getTime() - created.getTime()) / 1000);

    return `\n\nTimeline:\n` +
           `- Created: ${created.toLocaleString('en-US')}\n` +
           `- Source Initiated: +${sourceDelay}s\n` +
           `- Destination Initiated: +${destDelay}s`;
  } catch {
    return "";
  }
}