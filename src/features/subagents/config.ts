import * as z from "zod";

export const subagentsConfigSchema = z.object({});

export type SubagentsConfig = z.infer<typeof subagentsConfigSchema>;
