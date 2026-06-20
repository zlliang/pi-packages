import { getAgentDir } from "@earendil-works/pi-coding-agent";

import { loadConfig } from "../../config";
import { candidatesAction } from "./actions/candidates";
import { listAction } from "./actions/list";
import { spawnAction } from "./actions/spawn";
import { steerAction } from "./actions/steer";
import { SubagentManager } from "./manager";
import { registerSubagentTool } from "./registry";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Subagent actions exposed by the tool, ordered from discovery to delegation. */
const ACTIONS = [
  candidatesAction,
  listAction,
  spawnAction,
  steerAction,
];

export function registerSubagents(pi: ExtensionAPI): void {
  let manager: SubagentManager | undefined;

  pi.on("session_start", async (_event, ctx) => {
    const config = loadConfig(ctx).subagents;
    if (!config) return;

    manager = new SubagentManager(pi, getAgentDir());
    registerSubagentTool(pi, manager, ACTIONS);
    await manager.restore(ctx);
  });

  // Recompute branch-scoped status after the spawning turn ends (anchors are now persisted) and
  // after the user navigates the session tree (the active branch may have changed).
  pi.on("agent_end", (_event, ctx) => manager?.refreshStatus(ctx));
  pi.on("session_tree", (_event, ctx) => manager?.refreshStatus(ctx));

  pi.on("session_shutdown", () => {
    manager?.dispose();
    manager = undefined;
  });
}
