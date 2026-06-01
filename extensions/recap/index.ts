import { IdleListener } from "./idle";
import { RecapManager } from "./manager";
import { loadConfig } from "../shared/config";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let idleListener: IdleListener<ExtensionContext> | undefined = undefined;
  let recapManager: RecapManager | undefined = undefined;

  pi.on("session_start", (event, ctx) => {
    if (!ctx.hasUI) return;

    const config = loadConfig(ctx, "recap");
    if (!config) return;

    recapManager = new RecapManager(pi, config);

    pi.registerCommand("recap", {
      description: "Generate a short recap of the current session",
      handler: async () => await recapManager?.run(ctx, { force: true }),
    });

    idleListener = new IdleListener((c) => `idle:${c.isIdle()};editor:${c.ui.getEditorText()}`, config.idle);
    idleListener.on("enter", (c) => recapManager?.run(c));
    idleListener.on("wake", (c) => recapManager?.clear(c));

    if (event.reason === "resume" || event.reason === "fork") {
      idleListener.watch(ctx);
    }
  });

  pi.on("input", (_event, ctx) => {
    idleListener?.wake(ctx);
  });

  pi.on("user_bash", (_event, ctx) => {
    idleListener?.wake(ctx);
  });

  pi.on("agent_start", (_event, ctx) => {
    idleListener?.wake(ctx);
  });

  pi.on("session_before_compact", (_event, ctx) => {
    idleListener?.wake(ctx);
  });

  pi.on("session_before_tree", (_event, ctx) => {
    idleListener?.wake(ctx);
  });

  pi.on("agent_end", (_event, ctx) => {
    idleListener?.watch(ctx);
  });

  pi.on("session_compact", (_event, ctx) => {
    idleListener?.watch(ctx);
  });

  pi.on("session_tree", (_event, ctx) => {
    idleListener?.watch(ctx);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    recapManager?.clear(ctx);
    recapManager = undefined;

    idleListener?.dispose();
    idleListener = undefined;
  });
}
