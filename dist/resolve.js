"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveServiceAddress = resolveServiceAddress;
exports.resolveServiceAddressSync = resolveServiceAddressSync;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
function buildArgs(service, apiType, opts) {
    const args = ["get", "endpoints", service, "--type", apiType];
    if (opts.scope)
        args.push("--naming-scope", opts.scope);
    return args;
}
// Strip ANSI color codes the CLI may emit.
const ANSI = /\x1b\[[0-9;]*m/g;
// Parse codefly's tabwriter table:
//   NAME  TYPE  VISIBILITY  ADDRESS                 STATUS
//   rest  rest  private     http://localhost:10122  down
// Returns the first ADDRESS as a URL (host:port normalized to http://), or null.
function parseAddress(table) {
    const lines = table
        .replace(ANSI, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const header = lines.findIndex((l) => /\bADDRESS\b/.test(l) && /\bSTATUS\b/.test(l));
    if (header < 0)
        return null;
    for (const row of lines.slice(header + 1)) {
        const m = row.match(/https?:\/\/[^\s]+/) ?? row.match(/[\w.-]+:\d{2,5}\b/);
        if (m)
            return /^https?:\/\//.test(m[0]) ? m[0] : `http://${m[0]}`;
    }
    return null;
}
/** Resolve a service endpoint's address via `codefly get endpoints`.
 *  Returns a URL (e.g. "http://localhost:10122") or null if unresolved. */
async function resolveServiceAddress(service, apiType, opts = {}) {
    const bin = opts.codeflyBinary ?? "codefly";
    try {
        const { stdout } = await execFileAsync(bin, buildArgs(service, apiType, opts), {
            cwd: opts.cwd ?? process.cwd(),
        });
        return parseAddress(stdout);
    }
    catch (err) {
        // `codefly get endpoints` exits non-zero when nothing's listening yet,
        // but the deterministic address is still printed — parse it anyway.
        const e = err;
        return e?.stdout ? parseAddress(e.stdout) : null;
    }
}
/** Synchronous variant — for synchronous config files that can't await
 *  (e.g. Playwright's playwright.config.ts, evaluated at load time). */
function resolveServiceAddressSync(service, apiType, opts = {}) {
    const bin = opts.codeflyBinary ?? "codefly";
    try {
        const stdout = (0, node_child_process_1.execFileSync)(bin, buildArgs(service, apiType, opts), {
            cwd: opts.cwd ?? process.cwd(),
            encoding: "utf8",
        });
        return parseAddress(stdout);
    }
    catch (err) {
        const e = err;
        return e?.stdout ? parseAddress(e.stdout.toString()) : null;
    }
}
//# sourceMappingURL=resolve.js.map