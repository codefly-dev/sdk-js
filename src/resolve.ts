// resolve.ts — resolve a service's concrete endpoint address from codefly.
//
// codefly computes endpoint addresses DETERMINISTICALLY (the same port hash the
// runtime uses), so `codefly get endpoints <svc> --type <proto>` yields the
// correct host:port whether or not the stack is running. Test harnesses need
// exactly this: learn the api's REST/Connect port for THIS workspace before
// probing it — instead of hardcoding ports that are only correct in the
// workspace they were copied from. The port is workspace-hash-derived, so a
// consumer at a different module path (e.g. warden vs the canonical saas-starter)
// gets DIFFERENT ports; a hardcoded 5962/44790 silently misses there.

import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type EndpointProtocol = "rest" | "connect" | "grpc";

export interface ResolveOptions {
  /** Naming scope the stack runs under (matches withDependencies). */
  scope?: string;
  /** A directory inside the workspace; defaults to process.cwd(). */
  cwd?: string;
  /** codefly binary. Defaults to "codefly" (PATH lookup). */
  codeflyBinary?: string;
}

function buildArgs(
  service: string,
  apiType: EndpointProtocol,
  opts: ResolveOptions,
): string[] {
  const args = ["get", "endpoints", service, "--type", apiType];
  if (opts.scope) args.push("--naming-scope", opts.scope);
  return args;
}

// Strip ANSI color codes the CLI may emit.
const ANSI = /\x1b\[[0-9;]*m/g;

// Parse codefly's tabwriter table:
//   NAME  TYPE  VISIBILITY  ADDRESS                 STATUS
//   rest  rest  private     http://localhost:10122  down
// Returns the first ADDRESS as a URL (host:port normalized to http://), or null.
function parseAddress(table: string): string | null {
  const lines = table
    .replace(ANSI, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const header = lines.findIndex(
    (l) => /\bADDRESS\b/.test(l) && /\bSTATUS\b/.test(l),
  );
  if (header < 0) return null;
  for (const row of lines.slice(header + 1)) {
    const m = row.match(/https?:\/\/[^\s]+/) ?? row.match(/[\w.-]+:\d{2,5}\b/);
    if (m) return /^https?:\/\//.test(m[0]) ? m[0] : `http://${m[0]}`;
  }
  return null;
}

/** Resolve a service endpoint's address via `codefly get endpoints`.
 *  Returns a URL (e.g. "http://localhost:10122") or null if unresolved. */
export async function resolveServiceAddress(
  service: string,
  apiType: EndpointProtocol,
  opts: ResolveOptions = {},
): Promise<string | null> {
  const bin = opts.codeflyBinary ?? "codefly";
  try {
    const { stdout } = await execFileAsync(bin, buildArgs(service, apiType, opts), {
      cwd: opts.cwd ?? process.cwd(),
    });
    return parseAddress(stdout);
  } catch (err) {
    // `codefly get endpoints` exits non-zero when nothing's listening yet,
    // but the deterministic address is still printed — parse it anyway.
    const e = err as { stdout?: string };
    return e?.stdout ? parseAddress(e.stdout) : null;
  }
}

/** Synchronous variant — for synchronous config files that can't await
 *  (e.g. Playwright's playwright.config.ts, evaluated at load time). */
export function resolveServiceAddressSync(
  service: string,
  apiType: EndpointProtocol,
  opts: ResolveOptions = {},
): string | null {
  const bin = opts.codeflyBinary ?? "codefly";
  try {
    const stdout = execFileSync(bin, buildArgs(service, apiType, opts), {
      cwd: opts.cwd ?? process.cwd(),
      encoding: "utf8",
    });
    return parseAddress(stdout);
  } catch (err) {
    const e = err as { stdout?: string | Buffer };
    return e?.stdout ? parseAddress(e.stdout.toString()) : null;
  }
}
