![Cover](./assets/cover.png)

# pi-spark

A small, opinionated collection of [pi](https://pi.dev/) extensions.

## Extensions

- **Editor:** replaces the default editor with a compact working indicator (inspired by [Amp](https://ampcode.com/)) and current model info.
- **Footer:** shows session information, extension statuses, cost, and context usage on one line.
- **Fullscreen:** clears the screen and scrollback on session start, pins the editor and footer to the bottom for a full-screen session, and clears again on exit.
- **Presets:** switches named model presets with `/preset`, `--preset`, and quick cycle shortcuts.
- **Recap:** generates a short idle-session recap and exposes a `/recap` command for manual generation, inspired by [Claude Code's session recap](https://code.claude.com/docs/en/interactive-mode#session-recap).
- **Set session name:** exposes a `set_session_name` tool so the agent can give the current session a concise, recognizable name in the session selector.

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
  "fullscreen": true,
  "presets": {
    "claude-opus": {
      "model": "claude-opus-4-8",
      "provider": "anthropic",
      "thinkingLevel": "high"
    },
    "gpt": {
      "model": "gpt-5.5",
      "provider": "openai-codex",
      "thinkingLevel": "medium"
    }
  },
  "recap": {
    "idle": 180000,
    "model": "gpt-5.4-mini",
    "provider": "openai-codex",
    "thinkingLevel": "off"
  },
  "setSessionName": true
}
```

### Editor

- Set `editor` to `false` to keep pi's default editor.
- When enabled, `editor.spinner` controls the working indicator style and can be `dots`, `lights`, or `tildes`.

### Footer

- Set `footer` to `false` to keep pi's default footer.
- When enabled, pi-spark replaces the footer with a compact one-line view of session metadata, extension statuses, cost, and context usage.

### Fullscreen

- Set `fullscreen` to `false` to disable full-screen behavior.
- When enabled, pi-spark clears the screen and scrollback at session start and exit, pins the editor and footer to the bottom, and enables pi's `clearOnShrink` behavior programmatically so pinned UI stays aligned after taller components close.

### Presets

- Set `presets` to `false` to disable preset switching.
- When enabled, each key under `presets` defines a named model preset with `provider`, `model`, and optional `thinkingLevel` fields.

Use presets in these ways:

- Select interactively with `/preset` or `/preset <key>`
- Start pi with a preset using `pi --preset <key>`
- Cycle presets with `ctrl+super+p` and `ctrl+shift+super+p` (`super` is `command` on macOS)

### Recap

- Set `recap` to `false` to disable idle recaps and the `/recap` command.
- When enabled, pi-spark can generate a short recap after the session has been idle or when you run `/recap` manually.
- The `recap.idle` value is in milliseconds and must be at least `5000`. The recap model can be customized with `provider`, `model`, and `thinkingLevel`.

### Set session name

- Set `setSessionName` to `false` to disable the `set_session_name` tool.
- When enabled, the agent can set or refresh the current session's display name and optionally give a reason.
