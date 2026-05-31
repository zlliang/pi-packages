import Type from "typebox";
import Value from "typebox/value";

import { EditorConfigSchema } from "../../editor/config";

import type { Static } from "typebox";

const UserConfigSchema = Type.Object({
  editor: Type.Optional(Type.Union([Type.Boolean(), EditorConfigSchema])),
});

export type UserConfig = Static<typeof UserConfigSchema>;

export function resolveUserConfig(userConfig: unknown): UserConfig {
  return Value.Parse(UserConfigSchema, userConfig);
}
