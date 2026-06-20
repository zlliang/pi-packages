import { Container, Spacer, Text } from "@earendil-works/pi-tui";

import { defineAction } from "../registry";
import { stateIcon } from "../render";

import type { SubagentRecord } from "../types";

interface ListDetails {
  action: "list";
  subagents: SubagentRecord[];
}

export const listAction = defineAction({
  name: "list",
  summary: "lists the subagent sessions spawned from the current session, with state and cost",
  fields: {},
  promptGuidelines: [
    "Use the subagent tool's \"list\" action to find a subagent's session id before steering it.",
  ],
  renderResult(result, _options, theme) {
    const details = result.details as ListDetails | undefined;

    const container = new Container();
    container.addChild(new Spacer(1));

    if (!details || details.subagents.length === 0) {
      container.addChild(new Text(theme.fg("muted", "No subagent sessions yet."), 0, 0));
      return container;
    }

    for (const record of details.subagents) {
      const usage = `${record.turns} turn${record.turns === 1 ? "" : "s"}  $${record.cost.toFixed(4)}`;
      container.addChild(new Text(`${stateIcon(record.state, theme)} ${theme.bold(theme.fg("toolTitle", record.name))}  ${theme.fg("dim", usage)}`, 0, 0));
      container.addChild(new Text(theme.fg("dim", `id: ${record.sessionId}`), 0, 0));
    }

    return container;
  },
  async execute(_args, { ctx, manager }) {
    const subagents = manager.visible(ctx);
    const details: ListDetails = { action: "list", subagents };

    const text =
      subagents.length === 0
        ? "No subagent sessions yet."
        : subagents
            .map((record) => `${record.sessionId} [${record.state}] ${record.name} — ${record.turns} turns, $${record.cost.toFixed(4)}`)
            .join("\n");

    return {
      content: [{ type: "text", text }],
      details,
    };
  },
});
