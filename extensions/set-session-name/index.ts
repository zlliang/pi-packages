import { Container, Spacer, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { loadConfig } from "../shared/config";
import { sanitizeText } from "../shared/format";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;

    const config = loadConfig(ctx, "setSessionName");
    if (!config) return;

    pi.registerTool({
      name: "set_session_name",
      label: "set session name",
      description:
        "Set or refresh the current session's display name, shown in the session selector " +
        "instead of the first-message preview. Use this when a concise name would make the " +
        "session easier to recognize later, such as after a long opening prompt or a substantial " +
        "topic shift.",
      promptSnippet: "Set or refresh the current session's concise display name",
      promptGuidelines: [
        "Use set_session_name when the session would benefit from a concise, recognizable name, especially after a long, vague, or pasted opening prompt.",
        "Use set_session_name to refresh the name only after a substantial shift in the conversation's focus; do not rename for minor follow-ups.",
        "Include a concise set_session_name reason when it would help explain why the name identifies the session.",
      ],
      parameters: Type.Object({
        name: Type.String({
          minLength: 1,
          maxLength: 120,
          description:
            "Concise session display name. Use a short, recognizable phrase in sentence case, " +
            "ideally <= 72 characters. Do not use surrounding quotes, trailing punctuation, or " +
            "generic prefixes like \"Chat about\". Examples: \"Refactor auth module\", " +
            "\"Debug flaky CI pipeline\", \"Draft Q3 planning doc\".",
        }),
        reason: Type.Optional(Type.String({
          minLength: 1,
          maxLength: 240,
          description:
            "Optional concise reason for naming or renaming the current session. Explain what " +
            "made the name useful, such as a long pasted prompt, ambiguous first message, task " +
            "handoff, or substantial topic shift. Write a complete sentence, and keep it brief " +
            "and user-facing. Examples: \"The long pasted prompt needed a stable label.\", " +
            "\"The focus shifted from debugging to README updates.\", " +
            "\"The task migrated from a previous session.\"",
        })),
      }),
      renderCall(args, theme) {
        const name = sanitizeText(args.name);
        const reason = sanitizeText(args.reason ?? "");

        const container = new Container();
        container.addChild(new Text(`${theme.bold(theme.fg("toolTitle", "set_session_name"))} ${theme.fg("accent", `"${name}"`)}`, 0, 0));

        if (reason) {
          container.addChild(new Spacer(1));
          container.addChild(new Text(theme.fg("muted", reason), 0, 0));
        }

        return container;
      },
      renderResult(result, _options, theme, context) {
        const output = result.content
          .filter((content) => content.type === "text")
          .map((content) => content.text)
          .join("\n");

        return new Text(context.isError ? theme.fg("error", "\n" + output) : "", 0, 0);
      },
      async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
        const name = sanitizeText(params.name);
        if (!name) throw new Error("Session name was empty after normalization. Provide a short, non-empty phrase.");

        const previous = pi.getSessionName() ?? null;
        if (previous === name) {
          return {
            content: [{ type: "text", text: `Session is already named "${name}". No change.` }],
            details: { changed: false, previous },
          };
        }

        pi.setSessionName(name);

        return {
          content: [{ type: "text", text: `${previous ? `Renamed session from "${previous}" to "${name}".` : `Named session "${name}".`}` }],
          details: { changed: true, previous },
        };
      },
    });
  });
}
