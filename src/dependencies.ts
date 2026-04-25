// withDependencies — JS equivalent of the Go sdk.WithDependencies.
//
// What it does:
//   Spawns `codefly run service <service>` as a subprocess with the
//   right flags, waits until the spawned frontend/api is answering on
//   its deterministic port, then returns a handle the test (or any
//   long-running process) can destroy() on teardown.
//
// Why it exists:
//   Go tests can say `sdk.WithDependencies(ctx, ...)` and get real
//   postgres+redis+vault up in seconds. Playwright/Vitest/Jest had
//   nothing equivalent — tests either mocked (wrong) or relied on
//   humans running `codefly run` in another terminal (fragile). This
//   closes that gap.
//
// Key design choices:
//   - **Scoped by name**. Each test file / package picks a unique
//     `name` (or `scope`). codefly derives postgres / redis / CLI-
//     server ports from that name, so two test suites running in
//     parallel never collide on port 29660.
//   - **Keep-alive is explicit**. `keepAlive: true` leaves the stack
//     running after destroy() — a subsequent test run reuses it and
//     skips the 40-60s cold start. This is the single biggest lever
//     for the inner-loop-dev story. Default is false (clean teardown).
//   - **Fail-loud**. Spawn errors, timeout, port-not-ready — all
//     surface as rejected promises with actionable messages. No silent
//     "well, maybe it worked" paths.

import { ChildProcess, spawn } from "node:child_process";

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

  /** Explicit base URL to poll. If omitted, the SDK reads
   *  CODEFLY__ENDPOINT__…__REST from env after the stack is up (the
   *  running CLI writes those into the test process's env). */
  baseURL?: string;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilReady(
  url: string,
  deadline: number,
): Promise<void> {
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      // Any response that isn't a connection refusal counts — the app
      // may legitimately 401/403 an unauthenticated GET on /. What we
      // care about is "the server is accepting connections".
      if (res.status < 500) return;
    } catch (err) {
      lastErr = err;
    }
    await sleep(500);
  }
  throw new Error(
    `withDependencies: ${url} did not become ready before timeout. Last error: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

export async function withDependencies(
  opts: WithDependenciesOptions,
): Promise<Dependencies> {
  const bin = opts.codeflyBinary ?? "codefly";
  // Scope default is EMPTY — deterministic default ports (e.g. the
  // frontend's 21931) line up with the caller's baseURL default.
  //
  // Scoping is opt-in for parallel test processes that need their own
  // pristine postgres/redis: set opts.scope explicitly OR export
  // CODEFLY_TEST_SCOPE in the shell. When you scope, the derived ports
  // change — pass a matching baseURL too.
  const scope = opts.scope ?? process.env.CODEFLY_TEST_SCOPE ?? "";

  const keepAlive =
    opts.keepAlive ??
    process.env.CODEFLY_TEST_KEEP_ALIVE === "1" ??
    false;

  const args = ["run", "service", opts.service];
  if (opts.module) args.push("--module", opts.module);
  if (scope !== "") args.push("--naming-scope", scope);
  args.push("--headless", "--cli-server", "--exclude-root");
  if (opts.debug) args.push("-d");
  if (opts.fixture) args.push("--fixture", opts.fixture);
  if (opts.silents?.length) args.push("--silent", opts.silents.join(","));

  const child: ChildProcess = spawn(bin, args, {
    cwd: opts.cwd ?? process.cwd(),
    // Close stdin entirely — some services (Next.js dev) probe stdin
    // to decide whether they're attached to a TTY and change their
    // output behavior based on it. Piping stdin when we never write
    // anything leaves them waiting; ignore gives a proper EOF.
    //
    // stdout/stderr stay piped so we can see what's going on, but we
    // switch the streams to non-flowing mode so they drain as fast as
    // data arrives. Earlier version had 'data' listeners but under a
    // sandboxed parent (CI, sandbox shells) process.stdout.write would
    // silently block when the parent's write buffer filled, which then
    // backed up the child — deadlock. Using .resume() guarantees the
    // stream is always draining regardless of whether the parent can
    // keep up with display.
    stdio: ["ignore", "pipe", "pipe"],
    // Detach so the child survives if the parent test process is
    // killed hard — combined with keepAlive this is what makes
    // "restart test run, skip cold start" actually work.
    detached: keepAlive,
    env: process.env,
  });

  // Always attach listeners; without them the pipe buffer fills and
  // the child blocks on write(). Echo mode additionally tees to the
  // caller's stdout.
  if (opts.echo) {
    child.stdout?.on("data", (b: Buffer) => process.stdout.write(b));
    child.stderr?.on("data", (b: Buffer) => process.stderr.write(b));
  } else {
    child.stdout?.on("data", () => {});
    child.stderr?.on("data", () => {});
  }
  // Belt-and-suspenders: put streams in flowing mode in case a caller
  // attaches listeners after our setup (tests that want to capture
  // output post-hoc). Flowing mode guarantees the pipe never backs up.
  child.stdout?.resume();
  child.stderr?.resume();

  // Tear down the spawn if the spawn itself fails — spawn errors
  // arrive asynchronously on 'error' after return, so we track them.
  let spawnError: Error | null = null;
  child.on("error", (err) => {
    spawnError = err;
  });

  const baseURL = opts.baseURL ?? "http://localhost:21931";
  const readyURL = baseURL.replace(/\/$/, "") + (opts.readyPath ?? "/");
  const readyTimeoutMs = opts.readyTimeoutMs ?? 90_000;

  try {
    await waitUntilReady(readyURL, Date.now() + readyTimeoutMs);
  } catch (err) {
    if (spawnError) throw spawnError;
    // Ready check failed — try to kill the child to avoid leaking it.
    try {
      child.kill("SIGTERM");
    } catch {
      // Ignore; child may already be dead.
    }
    throw err;
  }

  return {
    baseURL,
    pid: child.pid ?? -1,
    async destroy() {
      if (keepAlive) {
        // Intentionally don't kill the subprocess — it keeps the
        // container-level deps (postgres/redis/vault) running for the
        // next test run. The detached spawn above ensures the child
        // continues after THIS process exits.
        child.unref();
        return;
      }
      // Graceful: SIGTERM first, then wait briefly, then SIGKILL.
      // codefly's own Ctrl-C handler does the orderly shutdown; giving
      // it ~5s is more than enough on a warm stack.
      child.kill("SIGTERM");
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null) return;
        await sleep(100);
      }
      try {
        child.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    },
  };
}
