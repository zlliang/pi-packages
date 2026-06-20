import type { ModelThinkingLevel } from "@earendil-works/pi-ai";

/** Source of a subagent definition, ordered by discovery priority (project wins). */
export type AgentSource = "project" | "user" | "bundled";

/** A named, reusable subagent definition discovered from a markdown file. */
export interface AgentManifest {
  name: string;
  description: string;
  /** Tool names the subagent may use; falls back to pi's default built-ins when omitted. */
  tools?: string[] | undefined;
  /** A concrete `provider/id` (or bare id) when resolvable, otherwise a free-form model hint. */
  model?: string | undefined;
  /** Thinking level for the subagent; falls back to the parent's current level when omitted. */
  thinkingLevel?: ModelThinkingLevel | undefined;
  systemPrompt: string;
  source: AgentSource;
  filePath: string;
}

/** One streamed step of a subagent run: a tool call it made, or a chunk of its text output. */
export type RunItem =
  | { type: "tool"; name: string; args: Record<string, unknown> }
  | { type: "text"; text: string };

/** Lifecycle state of a spawned subagent session. */
export type SubagentState = "running" | "idle" | "error";

/** A subagent session spawned from (and linked to) the current session. */
export interface SubagentRecord {
  sessionId: string;
  sessionFile: string;
  /** Name of the agent definition that spawned it. */
  agent: string;
  /** Display name, prefixed with the agent (e.g. `[reviewer] Review auth`). */
  name: string;
  /** The `provider/id` the session runs on, when known. */
  model?: string | undefined;
  /**
   * Id of the `subagent spawn` tool call that created this session. Used to scope the subagent to
   * the parent's session branch: it belongs to a branch when that tool call's assistant entry is on
   * the branch's active path. Undefined for legacy records (shown unconditionally).
   */
  parentToolCallId?: string | undefined;
  /** The most recent task or steering message. */
  task: string;
  state: SubagentState;
  /** Aggregate cost across the session's turns, in USD. */
  cost: number;
  turns: number;
  createdAt: number;
  lastActiveAt: number;
}

/** Tool result details for a spawn/steer run, carrying the streamed trace and final output. */
export interface RunDetails {
  action: "spawn" | "steer";
  sessionId: string;
  agent: string;
  name: string;
  model?: string | undefined;
  /** The task (spawn) or message (steer) that drove this run. */
  task: string;
  state: SubagentState;
  items: RunItem[];
  output: string;
  cost: number;
  turns: number;
  warning?: string | undefined;
  errorMessage?: string | undefined;
}
