import { convertToUSD, toNumber } from "../utils";

import type { Credits, CreditsProvider } from "../types";

const PROVIDER = "deepseek";
const URL = "https://api.deepseek.com/user/balance";

interface DeepSeekBalanceResponse {
  balance_infos?: DeepSeekBalanceInfo[] | null;
}

interface DeepSeekBalanceInfo {
  currency?: string;
  total_balance?: string | number;
}

export const deepseekProvider: CreditsProvider = {
  provider: PROVIDER,
  label: "DeepSeek",

  async fetch(_ctx, apiKey, signal): Promise<Credits> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const response = await fetch(URL, { headers, signal });
    if (!response.ok) throw new Error("request failed");

    const payload = (await response.json()) as DeepSeekBalanceResponse;
    const balance = payload.balance_infos?.find((entry) => entry.currency === "USD") ?? payload.balance_infos?.[0];
    const remaining = await convertToUSD(toNumber(balance?.total_balance), balance?.currency, signal);

    return { type: "balance", remaining };
  },
};
