import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getAgentDir, parseFrontmatter } from "@earendil-works/pi-coding-agent";

import type { ModelThinkingLevel } from "@earendil-works/pi-ai";
import type { AgentManifest, AgentSource } from "./types";

/** Directory of bundled, package-shipped agent definitions (lowest priority). */
const BUNDLED_AGENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "agents");

const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);

/**
 * Discover subagent definitions by priority: project-local (`.pi/agents/`) overrides global
 * (`~/.pi/agent/agents/`) overrides package-bundled. Same-named definitions from a
 * higher-priority source win. Definitions are rediscovered on each call so edits apply mid-session.
 *
 * Project-local definitions are repo-controlled prompts; the caller gates their use behind project
 * trust. They are still discovered here so `candidates` can surface them.
 */
export function discoverAgents(cwd: string): AgentManifest[] {
  const byName = new Map<string, AgentManifest>();

  // Lowest to highest priority, so later sources overwrite earlier ones.
  loadAgentsFromDir(BUNDLED_AGENTS_DIR, "bundled").forEach((agent) => byName.set(agent.name, agent));
  loadAgentsFromDir(join(getAgentDir(), "agents"), "user").forEach((agent) => byName.set(agent.name, agent));

  const projectDir = findNearestProjectAgentsDir(cwd);
  if (projectDir) loadAgentsFromDir(projectDir, "project").forEach((agent) => byName.set(agent.name, agent));

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function loadAgentsFromDir(dir: string, source: AgentSource): AgentManifest[] {
  if (!existsSync(dir)) return [];

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const agents: AgentManifest[] = [];
  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue;
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;

    const filePath = join(dir, entry.name);
    let content: string;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const { frontmatter, body } = parseFrontmatter<Record<string, string>>(content);
    if (!frontmatter.name || !frontmatter.description) continue;

    const tools = frontmatter.tools
      ?.split(",")
      .map((tool) => tool.trim())
      .filter(Boolean);

    const level = frontmatter.thinkingLevel?.trim();
    const thinkingLevel = level && THINKING_LEVELS.has(level) ? (level as ModelThinkingLevel) : undefined;

    agents.push({
      name: frontmatter.name,
      description: frontmatter.description,
      tools: tools && tools.length > 0 ? tools : undefined,
      model: frontmatter.model?.trim() || undefined,
      thinkingLevel,
      systemPrompt: body.trim(),
      source,
      filePath,
    });
  }

  return agents;
}

/** Walk up from cwd to find the nearest `.pi/agents` directory, like agent file discovery. */
function findNearestProjectAgentsDir(cwd: string): string | undefined {
  let current = cwd;
  while (true) {
    const candidate = join(current, ".pi", "agents");
    if (isDirectory(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
