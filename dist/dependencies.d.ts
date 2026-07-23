export interface WithDependenciesOptions {
    /** Service to run. For a full stack this is usually the edge service
     *  (e.g. "frontend") that pulls every other dep in via the codefly
     *  dependency graph. */
    service: string;
    /** Module override. Defaults to the service's module as discovered
     *  from the workspace layout — for monorepo setups with multiple
     *  modules, pin this explicitly. */
    module?: string;
    /** Naming scope = the test-isolation knob. Each test suite that wants
     *  its own pristine postgres/redis passes a unique name here. codefly
     *  derives every port from `workspace + "-" + scope`, so scopes don't
     *  fight over the same db/port. Matches the Go SDK's WithNamingScope. */
    scope?: string;
    /** Fixture to seed after the stack is up (e.g. "dev-admin"). */
    fixture?: string;
    /** Services whose stdout/stderr should be suppressed in the test log.
     *  E.g. ["store"] for postgres which is noisy. */
    silents?: string[];
    /** Debug logs from codefly itself. Off by default in tests. */
    debug?: boolean;
    /** Keep the dependency stack alive after destroy(). Subsequent runs
     *  in the SAME scope reuse it and start in milliseconds instead of
     *  minutes — the biggest lever for fast inner-loop dev.
     *
     *  Default: false (clean teardown). Flip to true via env
     *  CODEFLY_TEST_KEEP_ALIVE=1 for local iteration. */
    keepAlive?: boolean;
    /** URL to poll until it returns 2xx/3xx, signaling "ready". Usually
     *  the frontend or api homepage. Defaults to "/" on the base URL. */
    readyPath?: string;
    /** Explicit base URL to poll. If omitted, the SDK resolves the
     *  `readyService`'s REST address from codefly (`codefly get endpoints`),
     *  so the probe targets the correct workspace-derived port instead of a
     *  hardcoded guess. */
    baseURL?: string;
    /** Service whose REST endpoint is polled for readiness when `baseURL`
     *  is omitted. Defaults to `service` — but with --exclude-root you
     *  typically probe a DEPENDENCY (e.g. "api"), since the root service
     *  isn't started here. The address is resolved deterministically via
     *  `codefly get endpoints <readyService> --type rest`. */
    readyService?: string;
    /** Max wait for the stack to become ready. Default 90s — cold starts
     *  with docker image pulls can hit 60s; the ceiling is a safety net. */
    readyTimeoutMs?: number;
    /** Path to the codefly binary. Defaults to "codefly" (PATH lookup). */
    codeflyBinary?: string;
    /** Working directory the spawn runs in. Defaults to process.cwd(). */
    cwd?: string;
    /** Emit the codefly subprocess's stdout/stderr to the caller's
     *  streams. Handy when debugging a test; off by default to keep test
     *  output clean. */
    echo?: boolean;
}
export interface Dependencies {
    /** Base URL of the primary service (the one passed in `service`).
     *  Populated once the readiness probe succeeds. */
    baseURL: string;
    /** PID of the spawned codefly subprocess. */
    pid: number;
    /** Kill the stack gracefully. Respects keepAlive — when keepAlive is
     *  true this is a no-op on the subprocess (the container-level deps
     *  keep running), but still fulfills the handle's lifecycle contract. */
    destroy(): Promise<void>;
}
export declare function withDependencies(opts: WithDependenciesOptions): Promise<Dependencies>;
//# sourceMappingURL=dependencies.d.ts.map