import { getEntryUsage } from "../../utils/usage";
import { discoverAgents } from "./manifest";
import { createChildSession, StreamCollector } from "./session";

import { SessionManager } from "@earendil-works/pi-coding-agent";

import type { Api, Model } from "@earendil-works/pi-ai";
import type { AgentSession, AgentSessionEvent, ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { AgentManifest, RunDetails, SubagentRecord, SubagentState } from "./types";

/** Custom entry type marking a session as a subagent and carrying its definition metadata. */
const MARKER = "spark:subagent";

const NAME_TASK_MAX = 50;

interface MarkerData {
  agent: string;
  model?: string | undefined;
  task: string;
  /** Id of the `subagent spawn` tool call that created this session, scoping it to a branch. */
  parentToolCallId?: string | undefined;
}

interface SpawnParams {
  manifest: AgentManifest;
  task: string;
  /** Id of the `subagent spawn` tool call driving this spawn. */
  toolCallId: string;
  model?: Model<Api> | undefined;
  /** Display `provider/id` for the chosen model, when known. */
  modelSpec?: string | undefined;
  name?: string | undefined;
  warning?: string | undefined;
}

interface SteerParams {
  sessionId: string;
  message: string;
}

/**
 * Owns the subagent sessions spawned from the current session: spawning, steering, live status, and
 * rediscovery after reload. Sessions persist as sibling JSONL files linked to the parent via
 * `parentSession`, so idle subagents survive reload and stay steerable. Live `AgentSession` objects
 * are kept for spawned/steered sessions and rebuilt lazily when a restored session is steered.
 */
export class SubagentManager {
  private readonly records = new Map<string, SubagentRecord>();
  private readonly sessions = new Map<string, AgentSession>();
  private approvedProjectAgents = false;

  constructor(
    private readonly pi: ExtensionAPI,
    private readonly agentDir: string,
  ) {}

  /** All known subagent sessions, newest first, regardless of the parent's current branch. */
  list(): SubagentRecord[] {
    return Array.from(this.records.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Subagent sessions belonging to the parent's current branch, newest first. A subagent belongs to
   * the current branch when the `subagent spawn` tool call that created it is on the active path.
   * A subagent whose tool call is not yet anywhere in the parent's tree is also shown: it was just
   * spawned and the spawning turn's assistant entry has not been recorded yet.
   */
  visible(ctx: ExtensionContext): SubagentRecord[] {
    const onBranch = collectSubagentToolCallIds(ctx.sessionManager.getBranch());
    const anywhere = collectSubagentToolCallIds(ctx.sessionManager.getEntries());
    return this.list().filter(
      (record) => record.parentToolCallId === undefined || onBranch.has(record.parentToolCallId) || !anywhere.has(record.parentToolCallId),
    );
  }

  get(sessionId: string): SubagentRecord | undefined {
    return this.records.get(sessionId);
  }

  /**
   * Rediscover subagent sessions for the current parent by scanning sibling session files for ones
   * whose `parentSession` points here and that carry the subagent marker. Restored sessions start
   * idle; their `AgentSession` is rebuilt lazily on steer.
   */
  async restore(ctx: ExtensionContext): Promise<void> {
    const parentFile = ctx.sessionManager.getSessionFile();
    if (!parentFile) return;

    const sessionDir = ctx.sessionManager.getSessionDir();
    let infos: Awaited<ReturnType<typeof SessionManager.list>>;
    try {
      infos = await SessionManager.list(ctx.cwd, sessionDir);
    } catch {
      return;
    }

    for (const info of infos) {
      if (info.parentSessionPath !== parentFile) continue;
      if (this.records.has(info.id)) continue;

      let manager: SessionManager;
      try {
        manager = SessionManager.open(info.path);
      } catch {
        continue;
      }

      const entries = manager.getEntries();
      const marker = entries.find((entry) => entry.type === "custom" && entry.customType === MARKER);
      if (!marker || marker.type !== "custom") continue;
      const data = (marker.data ?? {}) as Partial<MarkerData>;

      const cost = entries.reduce((sum, entry) => sum + (getEntryUsage(entry)?.cost.total ?? 0), 0);
      const turns = entries.filter((entry) => entry.type === "message" && entry.message.role === "assistant").length;

      this.records.set(info.id, {
        sessionId: info.id,
        sessionFile: info.path,
        agent: data.agent ?? "unknown",
        name: info.name ?? data.agent ?? "subagent",
        model: data.model,
        parentToolCallId: data.parentToolCallId,
        task: data.task ?? "",
        state: "idle",
        cost,
        turns,
        createdAt: info.created.getTime(),
        lastActiveAt: info.modified.getTime(),
      });
    }

    this.updateStatus(ctx);
  }

  /** Whether the parent must confirm before running a project-local agent in this context. */
  needsProjectApproval(ctx: ExtensionContext, manifest: AgentManifest): boolean {
    return manifest.source === "project" && !ctx.isProjectTrusted() && !this.approvedProjectAgents;
  }

  approveProjectAgents(): void {
    this.approvedProjectAgents = true;
  }

  /** Spawn a new subagent session from a definition and run one task to completion (blocking). */
  async spawn(ctx: ExtensionContext, params: SpawnParams, signal: AbortSignal | undefined, onProgress: (details: RunDetails) => void): Promise<RunDetails> {
    const { manifest, task } = params;

    const parentFile = ctx.sessionManager.getSessionFile();
    const sessionDir = ctx.sessionManager.getSessionDir();
    const sessionManager = SessionManager.create(ctx.cwd, sessionDir, parentFile ? { parentSession: parentFile } : undefined);

    const markerData: MarkerData = { agent: manifest.name, model: params.modelSpec, task, parentToolCallId: params.toolCallId };
    sessionManager.appendCustomEntry(MARKER, markerData);

    const name = params.name?.trim() || `[${manifest.name}] ${truncate(task, NAME_TASK_MAX)}`;
    sessionManager.appendSessionInfo(name);

    const session = await createChildSession({
      ctx,
      agentDir: this.agentDir,
      sessionManager,
      appendSystemPrompt: manifest.systemPrompt || undefined,
      tools: manifest.tools,
      model: params.model ?? ctx.model,
      thinkingLevel: manifest.thinkingLevel ?? this.pi.getThinkingLevel(),
    });

    const sessionId = session.sessionId;
    const sessionFile = session.sessionFile ?? sessionManager.getSessionFile() ?? "";

    const record: SubagentRecord = {
      sessionId,
      sessionFile,
      agent: manifest.name,
      name,
      model: params.modelSpec,
      parentToolCallId: params.toolCallId,
      task,
      state: "running",
      cost: 0,
      turns: 0,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    this.records.set(sessionId, record);
    this.sessions.set(sessionId, session);

    return this.run(ctx, "spawn", record, session, task, params.warning, signal, onProgress);
  }

  /** Send a follow-up message to an existing subagent session and run it again (blocking). */
  async steer(ctx: ExtensionContext, params: SteerParams, signal: AbortSignal | undefined, onProgress: (details: RunDetails) => void): Promise<RunDetails> {
    const record = this.records.get(params.sessionId);
    if (!record) {
      throw new Error(`Unknown subagent session "${params.sessionId}". Use the "list" action to see spawned sessions.`);
    }

    const session = this.sessions.get(record.sessionId) ?? (await this.reopen(ctx, record));
    record.task = params.message;

    return this.run(ctx, "steer", record, session, params.message, undefined, signal, onProgress);
  }

  dispose(): void {
    for (const session of this.sessions.values()) {
      try {
        session.dispose();
      } catch {
        /* ignore */
      }
    }
    this.sessions.clear();
    this.records.clear();
  }

  private async run(
    ctx: ExtensionContext,
    action: "spawn" | "steer",
    record: SubagentRecord,
    session: AgentSession,
    message: string,
    warning: string | undefined,
    signal: AbortSignal | undefined,
    onProgress: (details: RunDetails) => void,
  ): Promise<RunDetails> {
    const collector = new StreamCollector();
    const baseCost = record.cost;
    const baseTurns = record.turns;

    record.state = "running";
    record.lastActiveAt = Date.now();
    this.updateStatus(ctx);

    const snapshot = (state: SubagentState): RunDetails => ({
      action,
      sessionId: record.sessionId,
      agent: record.agent,
      name: record.name,
      model: record.model,
      task: record.task,
      state,
      items: collector.items.slice(),
      output: collector.output,
      cost: baseCost + collector.cost,
      turns: baseTurns + collector.turns,
      warning,
      errorMessage: collector.errorMessage,
    });

    const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
      collector.handle(event);
      record.cost = baseCost + collector.cost;
      record.turns = baseTurns + collector.turns;
      onProgress(snapshot("running"));
    });

    const onAbort = () => void session.abort();
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      await session.prompt(message);
    } catch (error) {
      collector.errorMessage ??= error instanceof Error ? error.message : String(error);
    } finally {
      unsubscribe();
      signal?.removeEventListener("abort", onAbort);
    }

    const aborted = signal?.aborted ?? false;
    const state: SubagentState = collector.errorMessage || aborted ? "error" : "idle";
    if (aborted) collector.errorMessage ??= "Subagent run aborted.";

    record.state = state;
    record.cost = baseCost + collector.cost;
    record.turns = baseTurns + collector.turns;
    record.lastActiveAt = Date.now();
    this.updateStatus(ctx);

    return snapshot(state);
  }

  /** Rebuild a live `AgentSession` for a restored (idle) subagent so it can be steered. */
  private async reopen(ctx: ExtensionContext, record: SubagentRecord): Promise<AgentSession> {
    const sessionManager = SessionManager.open(record.sessionFile);
    const manifest = discoverAgents(ctx.cwd).find((agent) => agent.name === record.agent);

    const session = await createChildSession({
      ctx,
      agentDir: this.agentDir,
      sessionManager,
      appendSystemPrompt: manifest?.systemPrompt || undefined,
      tools: manifest?.tools,
      model: undefined,
      thinkingLevel: manifest?.thinkingLevel ?? this.pi.getThinkingLevel(),
    });

    this.sessions.set(record.sessionId, session);
    return session;
  }

  /** Recompute the footer status, e.g. after the parent navigates its session tree. */
  refreshStatus(ctx: ExtensionContext): void {
    this.updateStatus(ctx);
  }

  private updateStatus(ctx: ExtensionContext): void {
    if (!ctx.hasUI) return;
    const records = this.visible(ctx);
    if (records.length === 0) {
      ctx.ui.setStatus("subagents", undefined);
      return;
    }

    const running = records.filter((record) => record.state === "running").length;
    const idle = records.length - running;
    const cost = records.reduce((sum, record) => sum + record.cost, 0);

    const parts = [ctx.ui.theme.fg("dim", "Subagents")];
    if (running > 0) parts.push(ctx.ui.theme.fg("accent", `${running} running`));
    if (idle > 0) parts.push(ctx.ui.theme.fg("dim", `${idle} idle`));
    parts.push(ctx.ui.theme.fg("dim", `$${cost.toFixed(2)}`));

    ctx.ui.setStatus("subagents", parts.join(" "));
  }
}

function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

/** Collect the ids of `subagent` tool calls across the given session entries. */
function collectSubagentToolCallIds(entries: ReturnType<ExtensionContext["sessionManager"]["getEntries"]>): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.type !== "message" || entry.message.role !== "assistant") continue;
    for (const part of entry.message.content) {
      if (part.type === "toolCall" && part.name === "subagent") ids.add(part.id);
    }
  }
  return ids;
}
