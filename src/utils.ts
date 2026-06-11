import type { Usage } from "@earendil-works/pi-ai";

/** Structural type guard for the pi `Usage` shape. */
export function isUsage(value: unknown): value is Usage {
  if (typeof value !== "object" || value === null) return false;

  const usage = value as Record<string, unknown>;
  const hasTokenFields =
    typeof usage.input === "number" &&
    typeof usage.output === "number" &&
    typeof usage.cacheRead === "number" &&
    typeof usage.cacheWrite === "number" &&
    typeof usage.totalTokens === "number";
  if (!hasTokenFields) return false;

  if (typeof usage.cost !== "object" || usage.cost === null) return false;
  const cost = usage.cost as Record<string, unknown>;
  return (
    typeof cost.input === "number" &&
    typeof cost.output === "number" &&
    typeof cost.cacheRead === "number" &&
    typeof cost.cacheWrite === "number" &&
    typeof cost.total === "number"
  );
}

export function toNumber(value?: string | number | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const FRANKFURTER_API = "https://api.frankfurter.dev/v2/rate";

interface FrankfurterRateResponse {
  rate?: string | number;
}

export async function convertToUSD(amount: number | undefined, currency: string | undefined, signal: AbortSignal): Promise<number | undefined> {
  if (amount === undefined) return undefined;
  if (!currency || currency === "USD") return amount;

  const url = `${FRANKFURTER_API}/${encodeURIComponent(currency)}/USD`;
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error("currency conversion failed");

  const payload = (await response.json()) as FrankfurterRateResponse;
  const rate = toNumber(payload.rate);
  if (rate === undefined) throw new Error("currency conversion failed");

  return amount * rate;
}
