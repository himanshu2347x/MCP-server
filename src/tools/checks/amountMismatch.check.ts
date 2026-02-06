import { CheckResult, GardenOrderV2 } from "../../types/types.js";

export async function amountMismatchCheck(
  order: GardenOrderV2
): Promise<CheckResult> {
  const source = order.source_swap;
  const destination = order.destination_swap;

  if (!source || !destination) {
    return { matched: false };
  }

  const sourceAmount = BigInt(source.amount);
  const sourceFilled = BigInt(source.filled_amount);
  const destAmount = BigInt(destination.amount);
  const destFilled = BigInt(destination.filled_amount);

  const sourceInitiated = Boolean(source.initiate_tx_hash);
  const destInitiated = Boolean(destination.initiate_tx_hash);

  const sourceRedeemed = Boolean(source.redeem_tx_hash);
  const destRedeemed = Boolean(destination.redeem_tx_hash);

  if (sourceFilled > sourceAmount || destFilled > destAmount) {
    return {
      matched: true,
      reason_code: "overfilled_amount",
      summary:
        "Filled amount exceeds the requested amount, indicating an overfill anomaly",
      evidence: {
        source: {
          requested: sourceAmount.toString(),
          filled: sourceFilled.toString(),
        },
        destination: {
          requested: destAmount.toString(),
          filled: destFilled.toString(),
        },
      },
    };
  }

 
  if (
    (sourceInitiated && sourceFilled < sourceAmount && !sourceRedeemed) ||
    (destInitiated && destFilled < destAmount && !destRedeemed)
  ) {
    return {
      matched: true,
      reason_code: "partial_fill_after_initiation",
      summary:
        "Swap was initiated but only partially filled and never redeemed, indicating execution failure after initiation",
      evidence: {
        source: {
          initiated: sourceInitiated,
          requested: sourceAmount.toString(),
          filled: sourceFilled.toString(),
          redeemed: sourceRedeemed,
        },
        destination: {
          initiated: destInitiated,
          requested: destAmount.toString(),
          filled: destFilled.toString(),
          redeemed: destRedeemed,
        },
      },
    };
  }

  return { matched: false };
}
