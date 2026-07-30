/** Return a non-secret Codefly workspace configuration value. */
export declare function getWorkspaceConfiguration(name: string, key: string): string | undefined;
/** Return a secret Codefly workspace configuration value. */
export declare function getWorkspaceSecret(name: string, key: string): string | undefined;
/**
 * Resolve a workspace value from the public namespace first, then the secret
 * namespace. Use the explicit secret/public function when sensitivity is fixed.
 */
export declare function getWorkspaceValue(name: string, key: string): string | undefined;
//# sourceMappingURL=configuration.d.ts.map