import { defineActionFor, registerComposedTool } from "../../utils/tool";

import type { SubagentManager } from "./manager";
import type { Action } from "../../utils/tool";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export interface SubagentActionContext {
  pi: ExtensionAPI;
  ctx: ExtensionContext;
  manager: SubagentManager;
}

export const defineAction = defineActionFor<SubagentActionContext>();

export function registerSubagentTool(pi: ExtensionAPI, manager: SubagentManager, actions: Action<SubagentActionContext, any, any>[]): void {
  registerComposedTool<SubagentActionContext>(pi, {
    name: "subagent",
    label: "subagent",
    descriptionIntro:
      "Delegate focused work to specialized subagents — child sessions linked to this one, each " +
      "with its own isolated context:",
    descriptionOutro:
      "Subagents run in-process; spawn and steer block until the subagent finishes a turn and stream its progress. " +
      "Run independent work as multiple spawn calls in one turn.",
    promptSnippet: "Delegate focused work to specialized subagents",
    generalGuidelines: [
      "Use the subagent tool's \"candidates\" action to discover available subagents, then \"spawn\" to delegate a self-contained task; use \"steer\" to continue an existing subagent and \"list\" to see what is running.",
      "A subagent definition may specify a model hint instead of a concrete model; resolve it with the pi tool's \"models\" action and pass a concrete \"provider/id\" to spawn's \"model\".",
    ],
    actions,
    createContext: (ctx) => ({ pi, ctx, manager }),
  });
}
