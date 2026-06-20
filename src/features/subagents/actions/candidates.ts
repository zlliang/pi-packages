import { Container, Spacer, Text } from "@earendil-works/pi-tui";

import { discoverAgents } from "../manifest";
import { resolveModel } from "../model";
import { defineAction } from "../registry";

import type { AgentSource } from "../types";

interface CandidateInfo {
  name: string;
  description: string;
  source: AgentSource;
  tools?: string[] | undefined;
  model?: string | undefined;
  /** True when `model` is a free-form hint rather than a concrete model. */
  isHint: boolean;
}

interface CandidatesDetails {
  action: "candidates";
  agents: CandidateInfo[];
  warning?: string | undefined;
}

export const candidatesAction = defineAction({
  name: "candidates",
  summary: "lists the configured subagent definitions that can be spawned",
  fields: {},
  promptGuidelines: [
    "Use the subagent tool's \"candidates\" action to see which subagents are available before spawning one.",
  ],
  renderResult(result, _options, theme) {
    const details = result.details as CandidatesDetails | undefined;

    const container = new Container();
    container.addChild(new Spacer(1));

    if (!details || details.agents.length === 0) {
      container.addChild(new Text(theme.fg("muted", "No subagent definitions found."), 0, 0));
      return container;
    }

    for (const agent of details.agents) {
      const model = agent.model ? theme.fg(agent.isHint ? "warning" : "muted", ` ${agent.model}${agent.isHint ? " (hint)" : ""}`) : "";
      const head = `${theme.bold(theme.fg("toolTitle", agent.name))}${theme.fg("dim", ` (${agent.source})`)}${model}`;
      container.addChild(new Text(head, 0, 0));
      container.addChild(new Text(theme.fg("muted", agent.description), 0, 0));
      if (agent.tools) container.addChild(new Text(theme.fg("dim", `tools: ${agent.tools.join(", ")}`), 0, 0));
    }

    if (details.warning) {
      container.addChild(new Spacer(1));
      container.addChild(new Text(theme.fg("warning", details.warning), 0, 0));
    }

    return container;
  },
  async execute(_args, { pi, ctx }) {
    const registry = ctx.modelRegistry;
    const agents: CandidateInfo[] = discoverAgents(ctx.cwd).map((manifest) => {
      const resolution = resolveModel(registry, manifest.model);
      return {
        name: manifest.name,
        description: manifest.description,
        source: manifest.source,
        tools: manifest.tools,
        model: manifest.model,
        isHint: resolution.isHint,
      };
    });

    // Hint models need the pi tool's "models" action to resolve; warn if it is unavailable.
    const hasHints = agents.some((agent) => agent.isHint);
    const piToolActive = pi.getActiveTools().includes("pi");
    const warning =
      hasHints && !piToolActive
        ? "Some subagents specify a model hint, but the pi tool is unavailable to resolve it. Spawn falls back to the current model unless you pass a concrete \"model\"."
        : undefined;

    const lines = agents.map((agent) => {
      const model = agent.model ? ` model=${agent.model}${agent.isHint ? " (hint)" : ""}` : "";
      const tools = agent.tools ? ` tools=${agent.tools.join(",")}` : "";
      return `${agent.name} (${agent.source})${model}${tools}: ${agent.description}`;
    });
    const text = lines.length > 0 ? lines.join("\n") : "No subagent definitions found.";

    const details: CandidatesDetails = { action: "candidates", agents, warning };
    return {
      content: [{ type: "text", text: warning ? `${text}\n\n${warning}` : text }],
      details,
    };
  },
});
