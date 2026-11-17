const RATE_SOURCE =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=ngn";
const STEP_UP_BPS = 10_950n;
const STEP_DOWN_BPS = 9_050n;

export async function fetchEthNgn(): Promise<number> {
  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }

  const response = await fetch(RATE_SOURCE, { headers });
  if (!response.ok) {
    throw new Error(`Rate source responded with status ${response.status}`);
  }

  const body = (await response.json()) as { ethereum?: { ngn?: number } };
  const price = body.ethereum?.ngn;
  if (!price || price <= 0) {
    throw new Error("Rate source returned no NGN price for ETH");
  }
  return price;
}

export function toKobo(ngn: number | string): bigint {
  const value = Number(ngn);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid NGN price: ${ngn}`);
  }
  return BigInt(Math.round(value * 100));
}

export function stepToward(current: bigint, target: bigint): bigint {
  const max = (current * STEP_UP_BPS) / 10_000n;
  const min = (current * STEP_DOWN_BPS) / 10_000n;
  if (target > max) return max;
  if (target < min) return min;
  return target;
}
