import { isAbsolute, relative, resolve, sep } from "node:path";
import { truncateToWidth } from "@earendil-works/pi-tui";

import { SplitLine } from "../shared/components/split-line";
import { formatContextUsage, formatCost, sanitizeText } from "../shared/utils/format";

import type { ExtensionContext, ExtensionAPI, ReadonlyFooterDataProvider, Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";

class FooterComponent implements Component {
	private ctx: ExtensionContext;
	private theme: Theme;
	private footerData: ReadonlyFooterDataProvider;

	constructor(ctx: ExtensionContext, theme: Theme, footerData: ReadonlyFooterDataProvider) {
		this.ctx = ctx;
		this.theme = theme;
		this.footerData = footerData;
	}

	invalidate(): void {
		// No-op
	}

	render(width: number): string[] {
		return [this.renderMainLine(width), this.renderStatusLine(width)].filter(Boolean);
	}

	private renderMainLine(width: number): string {
		return new SplitLine(this.getLeft(), this.getRight(), 0, 2, "right").render(width)[0];
	}

	private getLeft(): string {
		let text = formatCwd(this.ctx.sessionManager.getCwd(), process.env.HOME || process.env.USERPROFILE);

		const branch = this.footerData.getGitBranch();
		if (branch) text = `${text} [${branch}]`;

		const sessionName = this.ctx.sessionManager.getSessionName();
		if (sessionName) text = `${text} • ${sessionName}`;

		return this.theme.fg("dim", text);
	}

	private getRight(): string {
		const costText = this.getCostText();
		const contextUsageText = this.getContextUsageText();

		return `${this.theme.fg("dim", costText)}${this.theme.fg("dim", " • ")}${this.theme.fg("dim", contextUsageText)}`;
	}

	private getCostText(): string {
		let cost = 0;
		this.ctx.sessionManager.getBranch().forEach((entry) => {
			if (entry.type !== "message") return;

			const message = entry.message;
			if (message.role !== "assistant") return;

			cost += message.usage.cost.total;
		});

		const isSubscription = this.ctx.model ? this.ctx.modelRegistry.isUsingOAuth(this.ctx.model) : false;

		return formatCost(cost, isSubscription);
	}

	private getContextUsageText(): string {
		const contextUsage = this.ctx.getContextUsage();

		return formatContextUsage(contextUsage);
	}

	/** Add extension statues on a single line, sorted by key alphabetically. */
	private renderStatusLine(width: number): string {
		const extensionStatuses = this.footerData.getExtensionStatuses();
		if (extensionStatuses.size === 0) return "";

		const statusLine = Array.from(extensionStatuses.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, text]) => sanitizeText(text))
			.join(this.theme.fg("dim", " • "));

		return truncateToWidth(statusLine, width, this.theme.fg("dim", "..."));
	}
}

function formatCwd(cwd: string, home?: string): string {
	if (!home) return cwd;

	const resolvedCwd = resolve(cwd);
	const resolvedHome = resolve(home);
	const relativeToHome = relative(resolvedHome, resolvedCwd);
	const isInsideHome = relativeToHome === "" || (relativeToHome !== ".." && !relativeToHome.startsWith(`..${sep}`) && !isAbsolute(relativeToHome));
	if (!isInsideHome) return cwd;

	return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;

		ctx.ui.setFooter((_tui, theme, footerData) => new FooterComponent(ctx, theme, footerData));
	});
}
