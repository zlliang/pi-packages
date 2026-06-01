import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

import { configSchemas } from "./schema";

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ConfigField, ConfigValue } from "./schema";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export function loadConfig<Field extends ConfigField>(ctx: ExtensionContext, field: Field, fileName: string = "spark.json"): ConfigValue<Field> | undefined {
  const rawConfig = loadMergedJson(getConfigPaths(ctx.cwd, fileName));
  const rawValue = rawConfig?.[field];
  if (rawValue === false) return undefined;

  const result = configSchemas[field].safeParse(rawValue === true || rawValue === undefined ? {} : rawValue);
  if (result.success) return result.data as ConfigValue<Field>;

  const message = result.error.issues.map((issue) => `${[field, ...issue.path].join(".")}: ${issue.message}`).join("; ");
  ctx.ui.notify(`Invalid spark config: ${message}`, "error");

  return undefined;
}

function getConfigPaths(cwd: string, fileName: string): [globalPath: string, projectPath: string] {
  return [join(getAgentDir(), fileName), join(cwd, ".pi", fileName)];
}

function loadMergedJson(paths: string[]): JsonObject | undefined {
  let merged: JsonObject | undefined;
  paths.forEach((path) => {
    const value = readJsonFile(path);
    if (value === undefined) return;

    merged = mergeConfig(merged, value);
  });

  return merged;
}

function readJsonFile(path: string): JsonObject | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as JsonObject;
  } catch {
    return undefined;
  }
}

function mergeConfig(base: JsonObject | undefined, override: JsonObject): JsonObject {
  if (base === undefined) return override;
  if (!isPlainObject(base) || !isPlainObject(override)) return override;

  const result: Record<string, JsonValue> = { ...base };
  Object.entries(override).forEach(([key, overrideValue]) => {
    const baseValue = base[key];
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = { ...baseValue, ...overrideValue };
    } else {
      result[key] = overrideValue;
    }
  });

  return result;
}

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
