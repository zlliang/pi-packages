![Cover](./assets/cover.png)

# pi-spark

A small, opinionated collection of [pi](https://pi.dev/) extensions.

## Extensions

- **Editor**: replaces the default editor with a compact working indicator and current model info.
- **Footer**: shows the session info, cost, and context usage in one line, followed by extension statuses.
- **Fullscreen**: clears the screen and scrollback on session start and pins the editor and footer to the bottom for a full-screen session.
- **Presets**: switches named model presets with `/preset` and quick cycle shortcuts.
- **Recap**: generates a short idle-session recap and exposes a `/recap` command for manual generation, inspired by [Claude Code's session recap](https://code.claude.com/docs/en/interactive-mode#session-recap).

![Screenshot](./assets/screenshot.png)

## Install

Install from npm:

```bash
pi install npm:pi-spark
```

Install from git:

```bash
pi install git:github.com/zlliang/pi-spark
```

## Configure

Spark reads config from `~/.pi/agent/spark.json` and from the current project’s `.pi/spark.json`. Project config overrides matching global fields.

Example:

```json
{
  "editor": {
    "spinner": "dots"
  },
  "footer": false,
  "presets": {
    "gpt": {
      "provider": "openai-codex",
      "model": "gpt-5.5",
      "thinkingLevel": "medium"
    },
    "claude-opus": {
      "provider": "anthropic",
      "model": "claude-opus-4-8",
      "thinkingLevel": "high"
    }
  },
  "recap": {
    "idle": 180000,
    "provider": "openai-codex",
    "model": "gpt-5.4-mini",
    "thinkingLevel": "off"
  }
}
```

Notes:

- Set an extension key to `false` to disable it.
- The `editor.spinner` value can be `lights` or `dots`.
- Presets can be selected with `/preset` or `/preset <key>`.
- Cycle presets with `ctrl+super+p` and `ctrl+shift+super+p` (`super` is `command` on macOS).
- The `recap.idle` value is in milliseconds and must be at least `5000`.

## Recommended pi settings

The Fullscreen extension pins the editor and footer to the bottom of the terminal. For the cleanest experience, pair it with pi's `terminal.clearOnShrink` setting, which clears empty rows when content shrinks so the pinned UI does not leave stale lines behind.

Add this to `~/.pi/agent/settings.json` (global) or `.pi/settings.json` (project):

```json
{
  "terminal": {
    "clearOnShrink": true
  }
}
```

This setting defaults to `false` because it can cause flicker in some terminals. With Fullscreen enabled the trade-off is usually worth it.
