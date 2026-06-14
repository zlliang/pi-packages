import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { sanitizeText } from "../../../utils/format";
import { defineAction } from "../registry";

interface NameDetails {
  action: "name";
  changed: boolean;
  previous: string | null;
}

export const nameAction = defineAction({
  name: "name",
  summary: "sets or updates the current session's name",
  fields: {
    name: Type.String({
      minLength: 1,
      maxLength: 120,
      description:
        "For \"name\": Use a short, recognizable phrase in sentence case, ideally <= 72 characters " +
        "(e.g., \"Refactor auth module\", \"Debug flaky CI pipeline\"). Do not use " +
        "surrounding quotes, trailing punctuation, or generic prefixes like \"Chat about\".",
    }),
  },
  required: ["name"],
  promptGuidelines: [
    "Use the pi tool's \"name\" action to give the current session a concise, recognizable name, especially after a long, vague, or pasted opening prompt, or after a substantial shift in the conversation's focus.",
  ],
  renderParams(args, theme) {
    return [theme.fg("muted", sanitizeText(args.name ?? ""))];
  },
  renderResult() {
    // "name" has no success UI; errors are rendered by the registry's fallback.
    return new Text("", 0, 0);
  },
  async execute(args, { pi }) {
    const name = sanitizeText(args.name);
    if (!name) throw new Error("Session name was empty after normalization; provide a short, non-empty phrase");

    const previous = pi.getSessionName() ?? null;
    if (previous === name) {
      const details: NameDetails = { action: "name", changed: false, previous };
      return {
        content: [{ type: "text", text: `Session is already named "${name}". Nothing changed.` }],
        details,
      };
    }

    pi.setSessionName(name);

    const details: NameDetails = { action: "name", changed: true, previous };
    return {
      content: [{ type: "text", text: previous ? `Renamed session from "${previous}" to "${name}".` : `Named session "${name}".` }],
      details,
    };
  },
});
