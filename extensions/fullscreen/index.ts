import { VERSION } from "@earendil-works/pi-coding-agent";

import { BottomFiller } from "./filler";
import { loadConfig } from "../shared/config";
import { sanitizeText } from "../shared/format";

import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

import type { TUI } from "@earendil-works/pi-tui";
import type { UserMessage } from "@earendil-works/pi-ai";

const WIDGET_KEY = "fullscreen";

function getSessionDisplayText(ctx: ExtensionContext, theme: Theme): string | undefined {
  const sessionName = ctx.sessionManager.getSessionName();
  if (sessionName) return theme.fg("warning", sanitizeText(sessionName));

  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type !== "message" || entry.message.role !== "user") continue;

    const text = extractText(entry.message);
    if (text) return sanitizeText(text);
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

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;

    const config = loadConfig(ctx, "fullscreen");
    if (!config) return;

    enabled = true;
    pendingClear = true;

    // The TUI handle isn't exposed via `ctx.ui`; the widget factory is the only place that
    // receives it. Mounting a persistent filler above the editor both captures the TUI and
    // pins the editor and footer to the bottom of the screen.
    ctx.ui.setWidget(WIDGET_KEY, (capturedTui) => {
      tui = capturedTui;

      // Enable `clearOnShrink`, but defer it to a macrotask. On `/reload`, pi resets
      // `clearOnShrink` to the settings value right after `session_start`, inside the reload's
      // microtask continuation. A `setTimeout` callback runs only after that microtask queue
      // drains, so it lands last and sticks. `queueMicrotask` (or a synchronous call) would run
      // before the reset and get clobbered.
      previousClearOnShrink ??= capturedTui.getClearOnShrink();
      setTimeout(() => capturedTui.setClearOnShrink(true));

      // Clear the screen once on entry. `session_start` has no TUI to repaint with, and a
      // synchronous repaint here is too early (the filler isn't in the render tree until
      // `setWidget` returns), so defer to a microtask. `pendingClear` limits this to the
      // `session_start`-triggered mount rather than every widget rebuild.
      if (pendingClear) {
        pendingClear = false;
        queueMicrotask(() => capturedTui.requestRender(true));
      }

      return new BottomFiller(capturedTui);
    });
  });

  pi.on("session_shutdown", (event, ctx) => {
    if (!enabled) return;

    // Restore `clearOnShrink` to its pre-fullscreen value.
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
      const sessionText = getSessionDisplayText(ctx, theme);
      const line = truncateToWidth(`${exitMessage}${sessionText ? `${theme.fg("dim", ":")} ${sessionText}` : ""}`, tui.terminal.columns, "…");
      tui.terminal.write(`${line}\r\n`);
    }

    tui = undefined;
    enabled = false;
    pendingClear = false;
  });
}
