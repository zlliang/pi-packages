![Cover](./assets/cover.png)

# pi-credits

A [pi](https://pi.dev/) extension that shows the active model provider's credit balance or rate-limit usage in the footer. It appears only for supported providers and uses the provider's stored credential or API key.

![Screenshot](./assets/screenshot.png)

> Example with an OpenAI Codex subscription, paired with my [pi-spark](https://github.com/zlliang/pi-spark) package.

## Supported providers

- DeepSeek
- Fireworks
- Moonshot
- OpenAI Codex
- OpenRouter
- Vercel AI Gateway

Most provider-specific fetching approaches references [CodexBar](https://github.com/steipete/codexbar). Fireworks is an exception: its balance lives behind an internal gRPC API, so the approach was reverse-engineered from the `firectl` binary — see [docs/fireworks.md](./docs/fireworks.md).

## Install

Install from npm:

```bash
pi install npm:pi-credits
```

Install from git:

```bash
pi install git:github.com/zlliang/pi-credits
```

## Other pi packages

- [pi-spark](https://github.com/zlliang/pi-spark): a small, opinionated collection of pi extensions.
