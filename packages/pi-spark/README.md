![Cover](./assets/cover.png)

# pi-spark

A small, opinionated collection of [pi](https://pi.dev/) extensions.

## Extensions

- **Editor:** replaces the default editor with a compact working indicator (inspired by [Amp](https://ampcode.com/)) and current model info.
- **Footer:** shows session information, extension statuses, cost, and context usage on one line.
- **Fullscreen:** clears the screen and scrollback on session start, pins the editor and footer to the bottom for a full-screen session, and clears again on exit.
- **Models:** exposes a `model` tool so the agent can list the models the user can use currently and inspect the provider, model, and thinking level in use.
- **Name:** exposes a `name` tool so the agent can give the current session a concise, recognizable name in the session selector.
- **Presets:** switches named model presets with `/preset`, `--preset`, and quick cycle shortcuts.
- **Recap:** generates a short idle-session recap and exposes a `/recap` command for manual generation, inspired by [Claude Code's session recap](https://code.claude.com/docs/en/interactive-mode#session-recap).

![Screenshot](./assets/screenshot.png)

## Install

Install from npm:

```bash
pi install npm:pi-spark
```

For local development from this monorepo:

```bash
pi install /path/to/pi-packages/packages/pi-spark
```

## Configure

Spark reads config from `~/.pi/agent/spark.json` and from the current project’s `.pi/spark.json`. Project config overrides matching global fields.

All extensions are enabled by default. Set a specific extension to `false` to disable it, for example, `"footer": false` disables the footer extension.

Example:

```json
{
  "editor": {
    "spinner": "dots"
  },
  "footer": false,
  "presets": {
    "claude-opus": {
      "provider": "anthropic",
      "model": "claude-opus-4-8",
      "thinkingLevel": "high"
    },
    "gpt": {
      "provider": "openai-codex",
      "model": "gpt-5.5",
      "thinkingLevel": "medium"
    }
  },
  "recap": {
    "idle": "5m",
    "provider": "openai-codex",
    "model": "gpt-5.4-mini",
    "thinkingLevel": "off"
  }
}
```

### Editor

- `editor.spinner` controls the working indicator style and can be `dots`, `lights`, `tildes`, or `pulse`.

### Footer

- pi-spark replaces the footer with a compact one-line view of session metadata, extension statuses, cost, and context usage.

### Fullscreen

- pi-spark clears the screen and scrollback at session start and exit, pins the editor and footer to the bottom, and enables pi's `clearOnShrink` behavior programmatically so pinned UI stays aligned after taller components close.

### Models

- The agent can call the `model` tool with two actions:
  - `active`: gets the active provider, model, and thinking level.
  - `list`: lists models with their metadata, with an optional [Liqe](https://github.com/gajus/liqe) (Lucene-like) `query` over model fields and `offset`/`limit` paging.

### Name

- The agent can set or refresh the current session's name and optionally give a reason.

### Presets

- Each key under `presets` defines a named model preset with `provider`, `model`, and optional `thinkingLevel` fields.

Use presets in these ways:

- Select interactively with `/preset` or `/preset <key>`
- Start pi with a preset using `pi --preset <key>`
- Cycle presets with `ctrl+super+p` and `ctrl+shift+super+p` (`super` is `command` on macOS)

### Recap

- pi-spark can generate a short recap after the session has been idle or when you run `/recap` manually.
- The `recap.idle` value sets how long the session must stay idle before a recap is generated. It accepts either a millisecond number or a human-readable duration string parsed by [vercel/ms](https://github.com/vercel/ms) (e.g., `"3m"`, `"30s"`, `"2 minutes"`), and must resolve to at least 5000ms.
- The recap model can be customized with `provider`, `model`, and `thinkingLevel`.

## Recommended pi settings

[Pi 0.79.0](https://pi.dev/news/releases/0.79.0) added a project trust dialog that asks before loading project-local resources ([earendil-works/pi#5514](https://github.com/earendil-works/pi/issues/5514)), and [pi 0.79.1](https://pi.dev/news/releases/0.79.1) made the default behavior configurable via `defaultProjectTrust`. To keep startup minimal, set it to `"always"` in `~/.pi/agent/settings.json` (or change it with `/settings`):

```json
{
  "defaultProjectTrust": "always"
}
```

Project trust is an [input-loading guard](https://pi.dev/docs/latest/security#project-trust), so use `"always"` only if you trust the projects you open.

## Other pi packages

- [pi-credits](https://github.com/zlliang/pi-packages/tree/main/packages/pi-credits): shows the active provider's credit balance or rate-limit usage as a footer status.
