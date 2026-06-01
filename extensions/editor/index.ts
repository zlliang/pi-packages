import { CustomEditor } from "@earendil-works/pi-coding-agent";

import { Spinner } from "./spinner";
import { SplitLine } from "../shared/components/split-line";
import { loadConfig } from "../shared/config";
import { autoCollectEvents, PRESET_CHANGE, parsePresetChange } from "../shared/events";
import { formatModel } from "../shared/format";

import type { ExtensionAPI, ExtensionContext, KeybindingsManager } from "@earendil-works/pi-coding-agent";
import type { TUI, EditorTheme } from "@earendil-works/pi-tui";

class Editor extends CustomEditor {
  private pi: ExtensionAPI;
  private ctx: ExtensionContext;

  private spinner: Spinner;
  private slots: { modelBefore: string | undefined };

  constructor(pi: ExtensionAPI, ctx: ExtensionContext, tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, spinner: Spinner = new Spinner()) {
    super(tui, theme, keybindings);

    this.pi = pi;
    this.ctx = ctx;

    this.spinner = spinner;
    this.spinner.setTUI(tui);
    this.slots = { modelBefore: undefined };
  }

  setSlot(slot: keyof typeof this.slots, value: string | undefined): void {
    this.slots[slot] = value;
    this.tui.requestRender();
  }

  render(width: number): string[] {
    const lines = super.render(width);
    if (lines.length === 0) return lines;

    lines[0] = this.renderTopBorder(width);

    return lines;
  }

  private renderTopBorder(width: number): string {
    const theme = this.ctx.ui.theme;

    const left = this.getLeft();
    const right = this.getRight();

    return new SplitLine(left, right, {
      padding: 1,
      innerPadding: 1,
      spacingChar: this.borderColor("─"),
      ellipsis: theme.fg("dim", "…"),
    }).render(width)[0];
  }

  private getLeft(): string {
    const theme = this.ctx.ui.theme;

    return theme.fg("accent", this.spinner.getFrame());
  }

  private getRight(): string {
    const theme = this.ctx.ui.theme;

    const modelBeforeText = this.slots.modelBefore;
    const modelText = formatModel(this.ctx.model?.provider, this.ctx.model?.id, this.pi.getThinkingLevel());

    return theme.fg("dim", [modelBeforeText, modelText].filter(Boolean).join(" • "));
  }
}

export default function (pi: ExtensionAPI) {
  const events = autoCollectEvents(pi);
  let spinner: Spinner | undefined = undefined;

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;

    const config = loadConfig(ctx, "editor");
    if (!config) return;

    spinner = new Spinner(config.spinner);

    ctx.ui.setWorkingVisible(false);
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      const editor = new Editor(pi, ctx, tui, theme, keybindings, spinner);

      events.on(PRESET_CHANGE, (data) => {
        const payload = parsePresetChange(data);
        editor.setSlot("modelBefore", payload ? `preset:${payload}` : undefined);
      });

      return editor;
    });
  });

  pi.on("agent_start", () => {
    spinner?.start();
  });

  pi.on("agent_end", () => {
    spinner?.stop();
  });

  pi.on("session_shutdown", () => {
    spinner?.dispose();
    spinner = undefined;
  });
}
