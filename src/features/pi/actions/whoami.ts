import { Container, Spacer, Text } from "@earendil-works/pi-tui";

import { defineAction } from "../registry";
import { toMetadata, toModelRow } from "../model";

import type { ModelThinkingLevel } from "@earendil-works/pi-ai";
import type { ModelMetadata } from "../model";

interface WhoamiDetails {
  action: "whoami";
  sessionName: string | null;
  model: ModelMetadata | null;
  thinkingLevel: ModelThinkingLevel;
}

export const whoamiAction = defineAction({
  name: "whoami",
  summary: "shows the current pi state, including session name, active model, and thinking level",
  fields: {},
  promptGuidelines: [
    "Use the pi tool's \"whoami\" action when you need the current session's name or the active model and thinking level.",
  ],
  renderResult(result, _options, theme) {
    const details = result.details as WhoamiDetails | undefined;

    const container = new Container();
    container.addChild(new Spacer(1));

    if (!details) {
      container.addChild(new Text(theme.fg("muted", "No pi state available."), 0, 0));
      return container;
    }

    const formatLine = (label: string, value: string) => `${label.padEnd(7)}  ${value}`;

    if (details.sessionName) {
      container.addChild(new Text(theme.fg("muted", formatLine("session", details.sessionName)), 0, 0));
    }

    if (details.model) {
      const row = toModelRow(details.model, details.thinkingLevel);
      const cells = [row.label, row.cost, row.context].join("  ");
      container.addChild(new Text(theme.fg("muted", formatLine("model", cells)), 0, 0));
    }

    return container;
  },
  async execute(_args, { pi, ctx }) {
    const state: WhoamiDetails = {
      action: "whoami",
      sessionName: pi.getSessionName() ?? null,
      model: ctx.model ? toMetadata(ctx.model, true) : null,
      thinkingLevel: pi.getThinkingLevel(),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(state) }],
      details: state,
    };
  },
});
