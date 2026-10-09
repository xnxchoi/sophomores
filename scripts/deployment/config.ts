import { createHash } from "node:crypto";

export type StageKind = "local" | "remote" | "manual";
export interface Stage {
  id: string;
  dependsOn: string[];
  kind: StageKind;
  check: string[];
  apply?: string[];
  rollback?: string[];
  rollbackCheck?: string[];
  retryCheck?: string[];
}
export interface DeploymentConfig {
  schema: 1;
  target: string;
  stages: Stage[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected configuration object");
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("Unknown configuration field");
}

function command(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 100 ||
    value.some(
      (arg) =>
        typeof arg !== "string" || arg.length > 8192 || arg.includes("\0")
    ) ||
    !value[0].trim()
  ) {
    throw new Error("Commands must be nonempty fixed argv arrays");
  }
  return [...value];
}

function stage(value: unknown): Stage {
  const input = object(value);
  keys(input, [
    "id",
    "dependsOn",
    "kind",
    "check",
    "apply",
    "rollback",
    "rollbackCheck",
    "retryCheck"
  ]);
  if (typeof input.id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(input.id))
    throw new Error("Invalid stage id");
  if (!["local", "remote", "manual"].includes(input.kind as string))
    throw new Error("Invalid stage kind");
  if (
    !Array.isArray(input.dependsOn) ||
    input.dependsOn.some((id) => typeof id !== "string") ||
    new Set(input.dependsOn).size !== input.dependsOn.length
  )
    throw new Error("Invalid dependencies");
  const result: Stage = {
    id: input.id,
    kind: input.kind as StageKind,
    dependsOn: [...input.dependsOn],
    check: command(input.check)
  };
  const optional = Object.fromEntries(
    ["apply", "rollback", "rollbackCheck", "retryCheck"]
      .filter((key) => input[key] !== undefined)
      .map((key) => [key, command(input[key])])
  );
  const output = { ...result, ...optional };
  if (
    output.kind === "manual" &&
    (output.apply || output.rollback || output.rollbackCheck)
  )
    throw new Error("Manual stages cannot mutate");
  if (
    Boolean(output.rollback) !== Boolean(output.rollbackCheck) ||
    (output.rollback && !output.apply)
  )
    throw new Error(
      "Rollback requires an apply command and both rollback commands"
    );
  return output;
}

/** Validates, copies, and canonicalizes configuration; commands are argv, never shell text. */
export function validateConfig(value: unknown): DeploymentConfig {
  const input = object(value);
  keys(input, ["schema", "target", "stages"]);
  if (input.schema !== 1) throw new Error("Unsupported configuration schema");
  if (
    typeof input.target !== "string" ||
    !input.target.trim() ||
    input.target.length > 200 ||
    /[\x00-\x1f]/.test(input.target)
  )
    throw new Error("Invalid target");
  if (
    !Array.isArray(input.stages) ||
    !input.stages.length ||
    input.stages.length > 100
  )
    throw new Error("Expected 1 to 100 stages");
  const stages = input.stages.map(stage);
  const ids = new Set(stages.map((item) => item.id));
  if (ids.size !== stages.length) throw new Error("Duplicate stage id");
  for (const item of stages)
    if (item.dependsOn.some((id) => !ids.has(id)))
      throw new Error("Missing dependency");
  const verified = new Set<string>();
  const visit = (id: string, ancestry: string[]): void => {
    if (ancestry.includes(id)) throw new Error("Dependency cycle");
    if (verified.has(id)) return;
    stages
      .find((item) => item.id === id)!
      .dependsOn.forEach((dep) => visit(dep, [...ancestry, id]));
    verified.add(id);
  };
  stages.forEach((item) => visit(item.id, []));
  return { schema: 1, target: input.target, stages };
}

export function configHash(config: DeploymentConfig): string {
  return createHash("sha256")
    .update(JSON.stringify(validateConfig(config)))
    .digest("hex");
}
