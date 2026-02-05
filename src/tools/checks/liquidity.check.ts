import fetch from "node-fetch";
import { GardenOrderV2, LiquidityResponse } from "../../types/types.js";


export async function liquidityCheck(order: GardenOrderV2) {

  const destinationSwap = order.destination_swap;
  const solverId = order.solver_id;

  if (!destinationSwap) {
    return { matched: false };
  }

  const destinationAsset = destinationSwap.asset;
  const destinationAmount = BigInt(destinationSwap.amount);

  const liquidityRes = await fetch(
    "https://api.garden.finance/v2/liquidity"
  );

  if (!liquidityRes.ok) {
    throw new Error("Failed to fetch Garden liquidity");
  }

  const liquidityJson =
    (await liquidityRes.json()) as LiquidityResponse;

  const solverLiquidity = liquidityJson.result.find(
    (s) =>
     s.solver_id?.toLowerCase() === solverId?.toLowerCase() 
  );

  if (!solverLiquidity) {
    return {
      matched: true,
      reason_code: "liquidity_unavailable",
      summary:
        "No liquidity information found for the solver handling this order",
      evidence: {
        solver_id: solverId,
        asset: destinationAsset,
      },
    };
  }

  const assetLiquidity = solverLiquidity.liquidity.find(
    (l) => l.asset === destinationAsset
  );

  if (!assetLiquidity) {
    return {
      matched: true,
      reason_code: "liquidity_unavailable",
      summary:
        "Solver does not have liquidity for the destination asset",
      evidence: {
        solver_id: solverId,
        asset: destinationAsset,
      },
    };
  }

  const availableBalance = BigInt(assetLiquidity.balance);

  if (availableBalance < destinationAmount) {
    return {
      matched: true,
      reason_code: "insufficient_liquidity",
      summary:
        "Solver liquidity was insufficient to fulfill the destination swap",
      evidence: {
        asset: destinationAsset,
        required_amount: destinationAmount.toString(),
        available_balance: availableBalance.toString(),
        readable_balance: assetLiquidity.readable_balance,
        fiat_value: assetLiquidity.fiat_value,
      },
    };
  }

  return { matched: false };
}
