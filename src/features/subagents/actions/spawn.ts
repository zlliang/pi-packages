import { Type } from "typebox";

import { sanitizeText } from "../../../utils/format";
import { discoverAgents } from "../manifest";
import { resolveModel } from "../model";
import { defineAction } from "../registry";
import { renderRun } from "../render";

import type { Api, Model } from "@earendil-works/pi-ai";
import type { AgentToolUpdateCallback } from "@earendil-works/pi-coding-agent";
import type { RunDetails } from "../types";

export const spawnAction = defineAction({
  name: "spawn",
  summary: "starts a new subagent session from a candidate and runs one task to completion",
  fields: {
    agent: Type.Optional(Type.String({ description: "For \"spawn\": Name of the subagent definition to run (see the \"candidates\" action)." })),
    task: Type.Optional(Type.String({ description: "For \"spawn\": The self-contained task to delegate to the subagent." })),
    model: Type.Optional(Type.String({ description: "For \"spawn\": Override the model as \"provider/id\" (or a bare model id). Use this to resolve a definition's model hint." })),
    name: Type.Optional(Type.String({ description: "For \"spawn\": Custom session name. Defaults to \"[<agent>] <task>\"." })),
  },
  required: ["agent", "task"],
  showTiming: true,
  promptGuidelines: [
    "Give each spawn a focused, self-contained task; the subagent does not see the parent conversation.",
  ],
  renderParams(args, theme) {
    const params: string[] = [];
    if (args.agent) params.push(theme.fg("accent", args.agent));
    if (args.model) params.push(theme.fg("muted", args.model));
    if (args.task) params.push(theme.fg("dim", preview(args.task)));
    return params;
  },
  renderResult(result, { expanded }, theme) {
    const details = result.details as RunDetails | undefined;
    if (!details) return renderRun({ action: "spawn", sessionId: "", agent: "", name: "subagent", task: "", state: "error", items: [], output: "", cost: 0, turns: 0 }, expanded, theme);
    return renderRun(details, expanded, theme);
  },
  async execute(args, { pi, ctx, manager }, signal, onUpdate, toolCallId) {
    const agentName = args.agent as string;
    const task = args.task as string;

    const manifest = discoverAgents(ctx.cwd).find((agent) => agent.name === agentName);
    if (!manifest) {
      const available = discoverAgents(ctx.cwd).map((agent) => agent.name).join(", ") || "none";
      return failed(`Unknown subagent "${agentName}". Available: ${available}.`);
    }

    if (manager.needsProjectApproval(ctx, manifest)) {
      if (!ctx.hasUI) {
        return failed(`Project-local subagent "${agentName}" requires a trusted project. Trust the project or run a user/bundled subagent.`);
      }
      const ok = await ctx.ui.confirm(
        "Run project-local subagent?",
        `Agent: ${agentName}\nSource: ${manifest.filePath}\n\nProject agents are repo-controlled prompts. Only continue for trusted repositories.`,
      );
      if (!ok) {
        return failed("Canceled: project-local subagent not approved.");
      }
      manager.approveProjectAgents();
    }

    const resolution = resolveModel(ctx.modelRegistry, manifest.model, args.model);
    const model: Model<Api> | undefined = resolution.model ?? ctx.model;
    const modelSpec = model ? `${model.provider}/${model.id}` : undefined;

    let warning: string | undefined;
    if (resolution.isHint && !args.model) {
      const piHint = pi.getActiveTools().includes("pi") ? " Use the pi tool's \"models\" action to pick one." : " The pi tool is unavailable to resolve it.";
      warning = `Model "${resolution.hint}" is a hint; ran on ${modelSpec ?? "the default model"}. Pass a concrete "model" to override.${piHint}`;
    }

    const details = await manager.spawn(
      ctx,
      { manifest, task, toolCallId, model: resolution.model, modelSpec, name: args.name, warning },
      signal,
      makeProgress(onUpdate),
    );

    return toResult(details);
  },
});

/** Bridge the manager's `RunDetails` progress into the composed tool's streaming callback. */
function makeProgress(onUpdate: AgentToolUpdateCallback<RunDetails> | undefined): (details: RunDetails) => void {
  return (details) => onUpdate?.({ content: [{ type: "text", text: details.output || "(running…)" }], details });
}

function toResult(details: RunDetails) {
  return {
    content: [{ type: "text" as const, text: details.output || details.errorMessage || "(no output)" }],
    details,
    isError: details.state === "error",
  };
}

/** An error result carrying minimal `RunDetails` so rendering stays uniform. */
function failed(message: string) {
  const details: RunDetails = { action: "spawn", sessionId: "", agent: "", name: "subagent", task: "", state: "error", items: [], output: "", cost: 0, turns: 0, errorMessage: message };
  return { content: [{ type: "text" as const, text: message }], details, isError: true };
}

/** Collapse whitespace and truncate for a single-line tool-call header. */
function preview(text: string): string {
  const oneLine = sanitizeText(text);
  return oneLine.length > 60 ? `${oneLine.slice(0, 60)}…` : oneLine;
}
