![Cover](./assets/cover.png)

# pi-spark

A small, opinionated collection of [pi](https://pi.dev/) extensions.

## Extensions

- **Editor:** replaces the default editor with a compact working indicator (inspired by [Amp](https://ampcode.com/)) and current model info.
- **Footer:** shows session information, extension statuses, cost, and context usage on one line.
- **Fullscreen:** clears the screen and scrollback on session start, pins the editor and footer to the bottom for a full-screen session, and clears again on exit.
- **Presets:** switches named model presets with `/preset`, `--preset`, and quick cycle shortcuts.
- **Recap:** generates a short idle-session recap and exposes a `/recap` command for manual generation, inspired by [Claude Code's session recap](https://code.claude.com/docs/en/interactive-mode#session-recap).

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
- The `editor.spinner` value can be `dots`, `lights`, or `tildes`.
- Fullscreen enables Pi's `clearOnShrink` behavior programmatically so the pinned editor and footer stay aligned after taller UI components close.
- Presets can be selected with `/preset` or `/preset <key>`.
- Start pi with a preset using `pi --preset <key>`.
- Cycle presets with `ctrl+super+p` and `ctrl+shift+super+p` (`super` is `command` on macOS).
- The `recap.idle` value is in milliseconds and must be at least `5000`.
