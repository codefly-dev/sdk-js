"use strict";
// Workspace configuration access.
//
// Codefly's environment-variable representation is a runtime transport detail.
// Applications must use these SDK functions so the encoding can evolve without
// leaking into product code. This mirrors sdk-go's WorkspaceConfiguration,
// WorkspaceSecret, and WorkspaceValue contract.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaceConfiguration = getWorkspaceConfiguration;
exports.getWorkspaceSecret = getWorkspaceSecret;
exports.getWorkspaceValue = getWorkspaceValue;
function envSource() {
    return typeof process !== "undefined" && process.env
        ? process.env
        : {};
}
function normalizeComponent(value) {
    return value.trim().toUpperCase().replace(/-/g, "_");
}
function configurationCandidates(name) {
    const exact = name.trim().toUpperCase();
    const normalized = normalizeComponent(name);
    return exact === normalized ? [exact] : [exact, normalized];
}
function configurationValue(prefix, name, key) {
    const normalizedKey = normalizeComponent(key);
    if (!name.trim() || !normalizedKey)
        return undefined;
    const env = envSource();
    for (const candidate of configurationCandidates(name)) {
        const value = env[`${prefix}__${candidate}__${normalizedKey}`]?.trim();
        if (value)
            return value;
    }
    return undefined;
}
/** Return a non-secret Codefly workspace configuration value. */
function getWorkspaceConfiguration(name, key) {
    return configurationValue("CODEFLY__WORKSPACE_CONFIGURATION", name, key);
}
/** Return a secret Codefly workspace configuration value. */
function getWorkspaceSecret(name, key) {
    return configurationValue("CODEFLY__WORKSPACE_SECRET_CONFIGURATION", name, key);
}
/**
 * Resolve a workspace value from the public namespace first, then the secret
 * namespace. Use the explicit secret/public function when sensitivity is fixed.
 */
function getWorkspaceValue(name, key) {
    return (getWorkspaceConfiguration(name, key) ?? getWorkspaceSecret(name, key));
}
//# sourceMappingURL=configuration.js.map