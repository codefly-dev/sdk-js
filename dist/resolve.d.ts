export type EndpointProtocol = "rest" | "connect" | "grpc" | "http";
export interface ResolveOptions {
    /** Naming scope the stack runs under (matches withDependencies). */
    scope?: string;
    /** A directory inside the workspace; defaults to process.cwd(). */
    cwd?: string;
    /** codefly binary. Defaults to "codefly" (PATH lookup). */
    codeflyBinary?: string;
}
/** Resolve a service endpoint's address via `codefly get endpoints`.
 *  Returns a URL (e.g. "http://localhost:10122") or null if unresolved. */
export declare function resolveServiceAddress(service: string, apiType: EndpointProtocol, opts?: ResolveOptions): Promise<string | null>;
/** Synchronous variant — for synchronous config files that can't await
 *  (e.g. Playwright's playwright.config.ts, evaluated at load time). */
export declare function resolveServiceAddressSync(service: string, apiType: EndpointProtocol, opts?: ResolveOptions): string | null;
//# sourceMappingURL=resolve.d.ts.map