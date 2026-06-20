import { Type } from "typebox";

import { sanitizeText } from "../../../utils/format";
import { defineAction } from "../registry";
import { renderRun } from "../render";

import type { AgentToolUpdateCallback } from "@earendil-works/pi-coding-agent";
import type { RunDetails } from "../types";

export const steerAction = defineAction({
  name: "steer",
  summary: "sends a follow-up message to an existing subagent session and runs it again",
  fields: {
    session: Type.Optional(Type.String({ description: "For \"steer\": Session id of the subagent to continue (see the \"list\" action)." })),
    message: Type.Optional(Type.String({ description: "For \"steer\": The follow-up message to send to the subagent." })),
  },
  required: ["session", "message"],
  showTiming: true,
  promptGuidelines: [
    "Use the subagent tool's \"steer\" action to continue a subagent with more context; it retains its own conversation history.",
  ],
  renderParams(args, theme) {
    const params: string[] = [];
    if (args.session) params.push(theme.fg("accent", args.session));
    if (args.message) {
      const oneLine = sanitizeText(args.message);
      params.push(theme.fg("dim", oneLine.length > 60 ? `${oneLine.slice(0, 60)}…` : oneLine));
    }
    return params;
  },
  renderResult(result, { expanded }, theme) {
    const details = result.details as RunDetails | undefined;
    if (!details) return renderRun({ action: "steer", sessionId: "", agent: "", name: "subagent", task: "", state: "error", items: [], output: "", cost: 0, turns: 0 }, expanded, theme);
    return renderRun(details, expanded, theme);
  },
  async execute(args, { ctx, manager }, signal, onUpdate) {
    const sessionId = args.session as string;
    const message = args.message as string;

    if (!manager.get(sessionId)) {
      const available = manager.list().map((record) => record.sessionId).join(", ") || "none";
      const details: RunDetails = { action: "steer", sessionId, agent: "", name: "subagent", task: message, state: "error", items: [], output: "", cost: 0, turns: 0, errorMessage: `Unknown subagent session "${sessionId}". Spawned sessions: ${available}.` };
      return { content: [{ type: "text" as const, text: details.errorMessage as string }], details, isError: true };
    }

    const details = await manager.steer(ctx, { sessionId, message }, signal, makeProgress(onUpdate));
    return {
      content: [{ type: "text" as const, text: details.output || details.errorMessage || "(no output)" }],
      details,
      isError: details.state === "error",
    };
  },
});

/** Bridge the manager's `RunDetails` progress into the composed tool's streaming callback. */
function makeProgress(onUpdate: AgentToolUpdateCallback<RunDetails> | undefined): (details: RunDetails) => void {
  return (details) => onUpdate?.({ content: [{ type: "text", text: details.output || "(running…)" }], details });
}
