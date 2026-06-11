import { convertToUSD, toNumber } from "../utils";

import type { Credits, CreditsProvider } from "../types";

interface MoonshotBalanceResponse {
  data?: {
    available_balance?: string | number;
  } | null;
}

/**
 * For Moonshot, the international and China-mainland accounts live on separate hosts and bill in
 * different currencies (USD vs CNY), which the endpoint does not report, so each pi provider ID
 * fixes both host and currency.
 */
function createMoonshotProvider(provider: string, host: string, currency: string): CreditsProvider {
  return {
    provider,
    label: "Moonshot",

    async fetch(_ctx, apiKey, signal): Promise<Credits> {
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      };

      const response = await fetch(`https://${host}/v1/users/me/balance`, { headers, signal });
      if (!response.ok) throw new Error("request failed");

      const payload = (await response.json()) as MoonshotBalanceResponse;
      const remaining = await convertToUSD(toNumber(payload.data?.available_balance), currency, signal);

      return { type: "balance", remaining };
    },
  };
}

export const moonshotProvider = createMoonshotProvider("moonshotai", "api.moonshot.ai", "USD");
export const moonshotCnProvider = createMoonshotProvider("moonshotai-cn", "api.moonshot.cn", "CNY");
