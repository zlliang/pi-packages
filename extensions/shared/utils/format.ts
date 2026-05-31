import type { Provider } from "@earendil-works/pi-ai";
import type { ContextUsage } from "@earendil-works/pi-coding-agent";

export function formatModel(provider?: Provider, model?: string, thinkingLevel?: string): string {
	return provider && model ? `${provider}/${model}${thinkingLevel ? `:${thinkingLevel}` : ""}` : "no-model";
}

export function formatTokens(count: number): string {
	if (count < 1_000) return count.toString();
	if (count < 10_000) return `${(count / 1_000).toFixed(1)}K`;
	if (count < 1_000_000) return `${Math.round(count / 1_000)}K`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

export function formatContextUsage(contextUsage: ContextUsage | undefined): string {
	const tokens = contextUsage?.tokens ?? null;
	const contextWindow = contextUsage?.contextWindow ?? null;
	const percent = contextUsage?.percent ?? null;
	const percentText = percent === null ? "?" : `${percent.toFixed(1)}%`;

	return `${tokens === null ? "?" : formatTokens(tokens)}/${contextWindow === null ? "?" : formatTokens(contextWindow)} (${percentText})`;
}

export function formatCost(cost: number, isSubscription: boolean): string {
	return `$${cost.toFixed(2)}${isSubscription ? " (sub)" : ""}`;
}

/** Replace newlines, tabs, carriage returns with space, then collapse multiple spaces */
export function sanitizeText(text: string): string {
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}
