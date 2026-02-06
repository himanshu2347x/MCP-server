import fetch from "node-fetch";

const API_BASE_URL = process.env.GARDEN_API_BASE_URL;

export async function fetchCurrentPrices(
  sourceAsset: string,
  destinationAsset: string
): Promise<[number, number]> {
  const res = await fetch(`${API_BASE_URL}/v2/fiat`);

  if (!res.ok) {
    throw new Error("Failed to fetch fiat prices");
  }

  const json = (await res.json()) as {
    result: Record<string, number>;
  };

  const sourcePrice = json.result[sourceAsset];
  const destinationPrice = json.result[destinationAsset];

  if (
    typeof sourcePrice !== "number" ||
    typeof destinationPrice !== "number" ||
    sourcePrice <= 0 ||
    destinationPrice <= 0
  ) {
    throw new Error(
      `Fiat price missing for assets (source=${sourceAsset}, dest=${destinationAsset})`
    );
  }

  return [sourcePrice, destinationPrice];
}
