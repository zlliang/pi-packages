import * as z from "zod";

import { editorConfigSchema } from "../../editor/config";
import { footerConfigSchema } from "../../footer/config";
import { fullscreenConfigSchema } from "../../fullscreen/config";
import { presetsConfigSchema } from "../../presets/config";
import { recapConfigSchema } from "../../recap/config";
import { setSessionNameConfigSchema } from "../../set-session-name/config";

export const configSchemas = {
  editor: editorConfigSchema,
  footer: footerConfigSchema,
  fullscreen: fullscreenConfigSchema,
  presets: presetsConfigSchema,
  recap: recapConfigSchema,
  setSessionName: setSessionNameConfigSchema,
};

export type ConfigField = keyof typeof configSchemas;
export type ConfigValue<Field extends ConfigField> = z.infer<(typeof configSchemas)[Field]>;
