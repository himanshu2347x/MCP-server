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
    (sourceFilled < sourceAmount && !sourceRedeemed) ||
    (destFilled < destAmount && !destRedeemed)
  ) {
    return {
      matched: true,
      reason_code: "partial_fill_unredeemed",
      summary:
        "Swap was only partially filled and never redeemed, likely due to liquidity or execution issues",
      evidence: {
        source: {
          requested: sourceAmount.toString(),
          filled: sourceFilled.toString(),
          redeemed: sourceRedeemed,
        },
        destination: {
          requested: destAmount.toString(),
          filled: destFilled.toString(),
          redeemed: destRedeemed,
        },
      },
    };
  }


  return { matched: false };
}
