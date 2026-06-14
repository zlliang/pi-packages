import { keyText, DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Box, Container, SelectList, Spacer, Text } from "@earendil-works/pi-tui";

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PresetManager } from "./manager";

export async function showPresetSelector(ctx: ExtensionContext, presetManager: PresetManager): Promise<string | undefined> {
  if (presetManager.keys.length === 0) {
    ctx.ui.notify("No presets defined in spark.json", "warning");
    return undefined;
  }

  const selected = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
    const items = presetManager.keys
      .toSorted((a, b) => Number(presetManager.isActive(ctx, b)) - Number(presetManager.isActive(ctx, a)))
      .map((key) => ({
        value: key,
        label: presetManager.isActive(ctx, key) ? `${key} ${theme.fg("success", "✓")} ` : key,
        description: presetManager.describe(key),
      }));

    const container = new Container();
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

    const box = new Box(1, 1);
    box.addChild(new Text(theme.bold(theme.fg("accent", "Select preset")), 0, 0));
    box.addChild(new Spacer(1));

    const selectList = new SelectList(items, 10, {
      selectedPrefix: (text) => theme.fg("accent", text),
      selectedText: (text) => theme.fg("accent", text),
      description: (text) => theme.fg("muted", text),
      scrollInfo: (text) => theme.fg("dim", text),
      noMatch: (text) => theme.fg("warning", text),
    });
    selectList.onSelect = (item) => done(item.value);
    selectList.onCancel = () => done(null);
    box.addChild(selectList);
    box.addChild(new Spacer(1));

    const keyHints = [
      ["↑↓", "navigate"],
      [keyText("tui.select.confirm"), "select"],
      [keyText("tui.select.cancel"), "cancel"],
    ] as const;
    box.addChild(new Text(keyHints.map((item) => `${theme.fg("dim", item[0])} ${theme.fg("muted", item[1])}`).join("  "), 0, 0));

    container.addChild(box);
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

    return {
      render: (width: number) => container.render(width),
      invalidate: () => container.invalidate(),
      handleInput: (data: string) => {
        selectList.handleInput(data);
        tui.requestRender();
      },
    };
  });

  return selected ?? undefined;
}
