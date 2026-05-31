import { visibleWidth } from "@earendil-works/pi-tui";

import { InlineText } from "./inline-text";

import type { Component } from "@earendil-works/pi-tui";

export type Side = "left" | "right";

/** Single-line component that places left and right text at opposite sides. */
export class SplitLine implements Component {
	private left: InlineText;
	private right: InlineText;
	private padding: number;
	private gap: number;
	private primarySide: Side;
	private spacingChar: string;

	constructor(left: InlineText | string, right: InlineText | string, padding: number = 0, gap: number = 1, primarySide: Side = "left", spacingChar: string = " ", ellipsis: string = "…") {
		if (visibleWidth(spacingChar) !== 1) throw new Error("spacingChar must have a visible width of 1");

		this.left = typeof left === "string" ? new InlineText(left, padding, " ", ellipsis) : left;
		this.right = typeof right === "string" ? new InlineText(right, padding, " ", ellipsis) : right;
		this.padding = padding;
		this.gap = gap;
		this.primarySide = primarySide;
		this.spacingChar = spacingChar;
	}

	invalidate(): void {
		// No-op
	}

	render(width: number): [string] {
		const minWidth = this.padding * 2 + 1;
		if (width < minWidth) return [this.spacingChar.repeat(width)];

		const contentWidth = width - this.padding * 2;
		const content = this.renderContent(contentWidth);
		const paddingText = this.spacingChar.repeat(this.padding);

		return [`${paddingText}${content}${paddingText}`];
	}

	private renderContent(width: number): string {
		const [primary, secondary] = this.primarySide === "left" ? [this.left, this.right] : [this.right, this.left];

		const renderedPrimary = primary.render(width)[0];
		const renderedPrimaryWidth = visibleWidth(renderedPrimary);
		const secondaryWidth = renderedPrimaryWidth > 0 ? width - renderedPrimaryWidth - this.gap : width;
		const renderedSecondary = secondary.render(secondaryWidth)[0];

		const [renderedLeft, renderedRight] = this.primarySide === "left" ? [renderedPrimary, renderedSecondary] : [renderedSecondary, renderedPrimary];
		const spacingWidth = width - visibleWidth(renderedLeft) - visibleWidth(renderedRight);

		return `${renderedLeft}${this.spacingChar.repeat(spacingWidth)}${renderedRight}`;
	}
}
