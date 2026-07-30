// Workspace configuration access.
//
// Codefly's environment-variable representation is a runtime transport detail.
// Applications must use these SDK functions so the encoding can evolve without
// leaking into product code. This mirrors sdk-go's WorkspaceConfiguration,
// WorkspaceSecret, and WorkspaceValue contract.

function envSource(): NodeJS.ProcessEnv {
  return typeof process !== "undefined" && process.env
    ? process.env
    : ({} as NodeJS.ProcessEnv);
}

function normalizeComponent(value: string): string {
  return value.trim().toUpperCase().replace(/-/g, "_");
}

function configurationCandidates(name: string): string[] {
  const exact = name.trim().toUpperCase();
  const normalized = normalizeComponent(name);
  return exact === normalized ? [exact] : [exact, normalized];
}

function configurationValue(
  prefix: string,
  name: string,
  key: string,
): string | undefined {
  const normalizedKey = normalizeComponent(key);
  if (!name.trim() || !normalizedKey) return undefined;

  const env = envSource();
  for (const candidate of configurationCandidates(name)) {
    const value = env[`${prefix}__${candidate}__${normalizedKey}`]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Return a non-secret Codefly workspace configuration value. */
export function getWorkspaceConfiguration(
  name: string,
  key: string,
): string | undefined {
  return configurationValue("CODEFLY__WORKSPACE_CONFIGURATION", name, key);
}

/** Return a secret Codefly workspace configuration value. */
export function getWorkspaceSecret(
  name: string,
  key: string,
): string | undefined {
  return configurationValue(
    "CODEFLY__WORKSPACE_SECRET_CONFIGURATION",
    name,
    key,
  );
}

/**
 * Resolve a workspace value from the public namespace first, then the secret
 * namespace. Use the explicit secret/public function when sensitivity is fixed.
 */
export function getWorkspaceValue(
  name: string,
  key: string,
): string | undefined {
  return (
    getWorkspaceConfiguration(name, key) ?? getWorkspaceSecret(name, key)
  );
}
