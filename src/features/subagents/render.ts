import { getMarkdownTheme, keyText } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@earendil-works/pi-tui";

import { sanitizeText } from "../../utils/format";

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { RunDetails, RunItem, SubagentState } from "./types";

const COLLAPSED_ITEM_COUNT = 8;

/** Cap for the expanded task line, roughly two terminal lines, to avoid flooding the cell. */
const EXPANDED_TASK_MAX = 200;

/** State glyph: `✗` failed, `○` running, `✓` done. */
export function stateIcon(state: SubagentState, theme: Theme): string {
  if (state === "error") return theme.fg("error", "✗");
  if (state === "running") return theme.fg("warning", "○");
  return theme.fg("success", "✓");
}

/** Render a spawn/steer run: a status header, the streamed trace, and (expanded) the final output. */
export function renderRun(details: RunDetails, expanded: boolean, theme: Theme): Container {
  const container = new Container();
  container.addChild(new Spacer(1));

  container.addChild(new Text(renderHeader(details, theme), 0, 0));
  // The call row only previews the task; show it in full (wrapped, capped) when expanded.
  if (expanded && details.task) {
    const task = sanitizeText(details.task);
    const capped = task.length > EXPANDED_TASK_MAX ? `${task.slice(0, EXPANDED_TASK_MAX)}…` : task;
    container.addChild(new Text(theme.fg("muted", "task: ") + theme.fg("dim", capped), 0, 0));
  }
  if (details.warning) container.addChild(new Text(theme.fg("warning", details.warning), 0, 0));
  if (details.errorMessage) container.addChild(new Text(theme.fg("error", details.errorMessage), 0, 0));

  const trace = expanded ? details.items : details.items.slice(-COLLAPSED_ITEM_COUNT);
  const skipped = details.items.length - trace.length;
  if (skipped > 0) container.addChild(new Text(theme.fg("muted", `… ${skipped} earlier items`), 0, 0));

  const lastTextIndex = expanded ? findLastTextIndex(trace) : -1;
  trace.forEach((item, index) => {
    if (item.type === "tool") {
      container.addChild(new Text(theme.fg("muted", "→ ") + renderToolCall(item, theme), 0, 0));
      return;
    }
    // In the expanded view, render the final text block as markdown; preview the rest.
    if (expanded && index === lastTextIndex) {
      container.addChild(new Spacer(1));
      container.addChild(new Markdown(item.text, 0, 0, getMarkdownTheme()));
      return;
    }
    const preview = item.text.split("\n").slice(0, 3).join("\n");
    container.addChild(new Text(theme.fg("toolOutput", preview), 0, 0));
  });

  if (!expanded && details.items.length > 0) {
    container.addChild(new Text(theme.fg("dim", `(${keyText("app.tools.expand")} to expand)`), 0, 0));
  }

  const usage = formatUsage(details);
  if (usage) {
    container.addChild(new Spacer(1));
    container.addChild(new Text(theme.fg("dim", usage), 0, 0));
  }

  return container;
}

function renderHeader(details: RunDetails, theme: Theme): string {
  let header = `${stateIcon(details.state, theme)} ${theme.bold(theme.fg("toolTitle", details.name))}`;
  if (details.model) header += theme.fg("muted", ` ${details.model}`);
  return header;
}

function formatUsage(details: RunDetails): string {
  const parts: string[] = [];
  if (details.turns > 0) parts.push(`${details.turns} turn${details.turns > 1 ? "s" : ""}`);
  if (details.cost > 0) parts.push(`$${details.cost.toFixed(4)}`);
  return parts.join(" ");
}

function findLastTextIndex(items: RunItem[]): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i]?.type === "text") return i;
  }
  return -1;
}

/** Compact tool-call rendering mirroring pi's built-in tool rows (`$ cmd`, `read path`, …). */
function renderToolCall(item: Extract<RunItem, { type: "tool" }>, theme: Theme): string {
  const args = item.args;
  const path = (key: string) => (typeof args[key] === "string" ? (args[key] as string) : undefined);

  switch (item.name) {
    case "bash": {
      const command = path("command") ?? "…";
      return theme.fg("muted", "$ ") + theme.fg("toolOutput", preview(command, 60));
    }
    case "read":
      return theme.fg("muted", "read ") + theme.fg("accent", path("file_path") ?? path("path") ?? "…");
    case "write":
      return theme.fg("muted", "write ") + theme.fg("accent", path("file_path") ?? path("path") ?? "…");
    case "edit":
      return theme.fg("muted", "edit ") + theme.fg("accent", path("file_path") ?? path("path") ?? "…");
    case "ls":
      return theme.fg("muted", "ls ") + theme.fg("accent", path("path") ?? ".");
    case "find":
      return theme.fg("muted", "find ") + theme.fg("accent", path("pattern") ?? "*") + theme.fg("dim", ` in ${path("path") ?? "."}`);
    case "grep":
      return theme.fg("muted", "grep ") + theme.fg("accent", `/${path("pattern") ?? ""}/`) + theme.fg("dim", ` in ${path("path") ?? "."}`);
    default: {
      const json = JSON.stringify(args);
      return theme.fg("accent", item.name) + theme.fg("dim", ` ${preview(json, 50)}`);
    }
  }
}

function preview(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
