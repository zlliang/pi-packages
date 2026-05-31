import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { sanitizeText } from "../utils/format";

import type { Component } from "@earendil-works/pi-tui";

/**
 * Text component that renders inline and truncates it to fit the given width.
 *
 * The given width is a budget, not a guaranteed rendered width. After rendering, callers should
 * check the result with visibleWidth(), because the rendered width may be smaller than the budget.
 */
export class InlineText implements Component {
	private text: string;
	private padding: number;
	private spacingChar: string;
	private ellipsis: string;

	constructor(text: string, padding: number = 0, spacingChar: string = " ", ellipsis: string = "…") {
		if (visibleWidth(spacingChar) !== 1) throw new Error("spacingChar must have a visible width of 1");

		this.text = sanitizeText(text);
		this.padding = padding;
		this.spacingChar = spacingChar;
		this.ellipsis = ellipsis;
	}

	invalidate(): void {
		// No-op
	}

	render(width: number): [string] {
		if (visibleWidth(this.text) <= 0) return [""];
		if (width < this.padding * 2 + visibleWidth(this.ellipsis)) return [""];

		const displayText = truncateToWidth(this.text, width - this.padding * 2, this.ellipsis);
		const paddingText = this.spacingChar.repeat(this.padding);

		return [`${paddingText}${displayText}${paddingText}`];
	}
}
