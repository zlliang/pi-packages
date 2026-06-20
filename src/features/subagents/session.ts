import { createAgentSession, DefaultResourceLoader } from "@earendil-works/pi-coding-agent";

import type { Api, Model, ModelThinkingLevel } from "@earendil-works/pi-ai";
import type { AgentSession, AgentSessionEvent, CreateAgentSessionOptions, ExtensionContext, SessionManager } from "@earendil-works/pi-coding-agent";
import type { RunItem } from "./types";

interface CreateChildOptions {
  ctx: ExtensionContext;
  agentDir: string;
  sessionManager: SessionManager;
  /** Manifest body appended after pi's base system prompt, defining the subagent's persona. */
  appendSystemPrompt?: string | undefined;
  /** Tool allowlist; falls back to pi's default built-ins when omitted. */
  tools?: string[] | undefined;
  model?: Model<Api> | undefined;
  thinkingLevel: ModelThinkingLevel;
}

/**
 * Create an in-process subagent session. The child uses a clean resource loader (no extensions,
 * skills, prompts, or themes) so pi-spark and other extensions are not re-loaded recursively; only
 * the agent's persona is appended to pi's base system prompt. The `subagent` tool is unavailable to
 * the child both because extensions are disabled and because the tool allowlist excludes it.
 */
export async function createChildSession(options: CreateChildOptions): Promise<AgentSession> {
  const { ctx, agentDir, sessionManager, appendSystemPrompt, tools, model, thinkingLevel } = options;

  const loaderOptions: ConstructorParameters<typeof DefaultResourceLoader>[0] = {
    cwd: ctx.cwd,
    agentDir,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
  };
  if (appendSystemPrompt) loaderOptions.appendSystemPrompt = [appendSystemPrompt];

  const resourceLoader = new DefaultResourceLoader(loaderOptions);
  await resourceLoader.reload();

  const sessionOptions: CreateAgentSessionOptions = {
    cwd: ctx.cwd,
    agentDir,
    modelRegistry: ctx.modelRegistry,
    authStorage: ctx.modelRegistry.authStorage,
    thinkingLevel,
    resourceLoader,
    sessionManager,
  };
  if (model) sessionOptions.model = model;
  if (tools) sessionOptions.tools = tools;

  const { session } = await createAgentSession(sessionOptions);

  return session;
}

/**
 * Accumulates a subagent session's streamed output: the tool calls it makes, its text, aggregate
 * cost, and turn count. A snapshot feeds the live tool-result trace; the final snapshot is the
 * stored result. State is derived from events, never from polling.
 */
export class StreamCollector {
  readonly items: RunItem[] = [];
  output = "";
  cost = 0;
  turns = 0;
  errorMessage?: string | undefined;

  handle(event: AgentSessionEvent): void {
    if (event.type === "tool_execution_start") {
      this.items.push({ type: "tool", name: event.toolName, args: (event.args as Record<string, unknown>) ?? {} });
      return;
    }

    if (event.type === "turn_end") {
      const message = event.message as AssistantLike | undefined;
      this.turns += 1;
      this.cost += message?.usage?.cost?.total ?? 0;

      const text = extractText(message);
      if (text) {
        this.items.push({ type: "text", text });
        this.output = text;
      }
      if (message?.errorMessage) this.errorMessage = message.errorMessage;
    }
  }
}

interface AssistantLike {
  role?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: { cost?: { total?: number } };
  errorMessage?: string;
}

function extractText(message: AssistantLike | undefined): string {
  if (!message?.content) return "";
  return message.content
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text as string)
    .join("\n")
    .trim();
}
