import type { Api, Model } from "@earendil-works/pi-ai";
import type { ModelRegistry } from "@earendil-works/pi-coding-agent";

/** Outcome of resolving a model spec (from a manifest or a spawn override) against the registry. */
export interface ModelResolution {
  /** The concrete model to run on, or undefined to fall back to the parent's current model. */
  model?: Model<Api> | undefined;
  /** The spec that produced `model`, when one matched. */
  spec?: string | undefined;
  /** True when a spec was given but matched no concrete model, so it is treated as a hint. */
  isHint: boolean;
  /** The unmatched spec, surfaced as a hint for the parent to resolve. */
  hint?: string | undefined;
}

/**
 * Resolve the model for a subagent run. Priority: spawn `override` > manifest `model`. A spec
 * matches a concrete model either as `provider/id` or as a bare `id` (preferring available models).
 * When a spec is present but unmatched, it is treated as a natural-language hint and `model` is left
 * undefined so the caller can fall back to the parent's model.
 */
export function resolveModel(registry: ModelRegistry, manifestModel?: string, override?: string): ModelResolution {
  const spec = override?.trim() || manifestModel?.trim();
  if (!spec) return { isHint: false };

  const model = findModel(registry, spec);
  if (model) return { model, spec, isHint: false };

  return { isHint: true, hint: spec };
}

function findModel(registry: ModelRegistry, spec: string): Model<Api> | undefined {
  const slash = spec.indexOf("/");
  if (slash !== -1) {
    return registry.find(spec.slice(0, slash), spec.slice(slash + 1));
  }

  // Bare id: prefer a model whose auth is configured, then any model with that id.
  return registry.getAvailable().find((model) => model.id === spec) ?? registry.getAll().find((model) => model.id === spec);
}
