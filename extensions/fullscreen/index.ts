import { VERSION } from "@earendil-works/pi-coding-agent";

import { BottomFiller } from "./filler";
import { loadConfig } from "../shared/config";
import { sanitizeText } from "../shared/format";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

import type { TUI } from "@earendil-works/pi-tui";
import type { UserMessage } from "@earendil-works/pi-ai";

const WIDGET_KEY = "fullscreen";

function getSessionDisplayName(ctx: ExtensionContext): string | undefined {
  const sessionName = ctx.sessionManager.getSessionName();
  if (sessionName) return sessionName;

  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type !== "message" || entry.message.role !== "user") continue;

    const text = extractText(entry.message);
    if (text) return text;
  }

  return undefined;
}

function extractText(message: UserMessage): string {
  const content = message.content;
  if (typeof content === "string") return content;

  return content.filter((block) => block.type === "text").map((block) => block.text).join(" ");
}

export default function (pi: ExtensionAPI) {
  let tui: TUI | undefined;
  let enabled = false;
  let pendingClear = false;
  let previousClearOnShrink: boolean | undefined;

  /**
   * Mount a persistent filler above the editor. The widget factory receives the TUI handle
   * (otherwise unavailable via `ctx.ui`), so it both captures the TUI for clearing and pins the
   * editor and footer to the bottom of the screen.
   */
  function mountFiller(ctx: ExtensionContext): void {
    ctx.ui.setWidget(WIDGET_KEY, (capturedTui) => {
      tui = capturedTui;

      previousClearOnShrink ??= tui.getClearOnShrink();
      tui.setClearOnShrink(true);

      if (pendingClear) {
        pendingClear = false;
        queueMicrotask(() => capturedTui.requestRender(true));
      }

      return new BottomFiller(capturedTui);
    });
  }

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;

    const config = loadConfig(ctx, "fullscreen");
    if (!config) return;

    enabled = true;

    if (tui) {
      tui.setClearOnShrink(true);
      tui.requestRender(true);
      return;
    }

    pendingClear = true;
    mountFiller(ctx);
  });

  pi.on("session_shutdown", (event, ctx) => {
    if (!enabled) return;

    if (previousClearOnShrink !== undefined) {
      tui?.setClearOnShrink(previousClearOnShrink);
      previousClearOnShrink = undefined;
    }

    if (event.reason === "quit" && tui) {
      // On normal interactive quit, shutdown handlers run after pi stops the TUI, so
      // `requestRender(true)` can no longer repaint. Write the clear sequence directly: clear
      // screen, move home, then clear scrollback.
      tui.terminal.write("\x1b[2J\x1b[H\x1b[3J");

      // Leave one concise line after the cleared session.
      const theme = ctx.ui.theme;
      const exitMessage = `${theme.bold(theme.fg("accent", "pi"))} ${theme.fg("dim", `v${VERSION} exited`)}`;
      const sessionName = getSessionDisplayName(ctx);
      const line = truncateToWidth(`${exitMessage}${sessionName ? `${theme.fg("dim", ":")} ${sanitizeText(sessionName)}` : ""}`, tui.terminal.columns, "…");
      tui.terminal.write(`${line}\r\n`);
    }

    tui = undefined;
    enabled = false;
    pendingClear = false;
  });
}
