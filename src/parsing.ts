// Env-var parsing. codefly injects `CODEFLY__ENDPOINT__<MODULE>__
// <SERVICE>__<NAME>__<PROTOCOL>=<url>` for every endpoint of every
// service a consumer depends on. REST endpoints additionally get
// `CODEFLY__REST_ROUTE__<MODULE>__<SERVICE>__<NAME>__REST___<PATH>___<METHOD>`
// entries describing each route.
//
// The previous implementation ONLY parsed __REST suffixes, so Connect-ES
// and gRPC endpoints (heavily used in saas-starter) were invisible to
// the SDK. This module now recognizes all three protocols.
//
// Also previously: the endpoint regex used greedy `(.+)` matchers
// everywhere, which splits module/service names containing underscores
// into the wrong groups. The fixed regex uses a character class that
// excludes `_` from component bodies.

import {
  ModuleEndpoints,
  Protocol,
  Route,
  ServiceEndpoint,
} from "./types";

// Re-exports keep backwards compatibility with consumers that imported
// these names from `parsing` directly.
export type { ModuleEndpoints, Route, ServiceEndpoint } from "./types";

// Component pattern: uppercase letters, digits, dash. Underscores are
// the component SEPARATOR so they can't appear inside a component —
// the Go side enforces this by converting snake_case to dash-case
// before writing the env var.
const COMPONENT = "[A-Z0-9-]+";

const ENDPOINT_RE = new RegExp(
  `CODEFLY__ENDPOINT__(${COMPONENT})__(${COMPONENT})__(${COMPONENT})__(REST|CONNECT|GRPC)$`,
);

// REST-route env vars look like:
//   CODEFLY__REST_ROUTE__<MODULE>__<SERVICE>__<NAME>__REST___<PATH>___<METHOD>
// where <PATH> has `/` replaced with `__`. The three underscores before
// the path (___) distinguish path segments from the endpoint header.
const ROUTE_RE = new RegExp(
  `CODEFLY__REST_ROUTE__(${COMPONENT})__(${COMPONENT})__(${COMPONENT})__REST___(.+)___([A-Z]+)$`,
);

function endpointKey(
  module: string,
  service: string,
  name: string,
  protocol: Protocol,
): string {
  return `${module}:${service}:${name}:${protocol}`;
}

function envSource(): NodeJS.ProcessEnv {
  // Always read fresh — the previous cached `_endpoints` const (populated
  // at module load time) was invisible to any env var set AFTER import.
  // Matters in test harnesses that set env then require() the SDK.
  return typeof process !== "undefined" && process.env
    ? process.env
    : ({} as NodeJS.ProcessEnv);
}

const BARE_HTTP_AUTHORITY = /^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\]):\d{1,5}$/;

/** Codefly's REST/Connect runtimes may expose either a URL or host:port.
 *  The SDK contract is a URL, so normalize the transport detail here once. */
function endpointAddress(protocol: Protocol, value: string): string {
  const address = value.trim();
  if ((protocol === "REST" || protocol === "CONNECT") && BARE_HTTP_AUTHORITY.test(address)) {
    return `http://${address}`;
  }
  return address;
}

function parseEndpoints(): Record<string, ServiceEndpoint> {
  const env = envSource();
  const out: Record<string, ServiceEndpoint> = {};
  for (const key of Object.keys(env)) {
    const m = key.match(ENDPOINT_RE);
    if (!m) continue;
    const [, mod, svc, name, protoRaw] = m;
    const protocol = protoRaw as Protocol;
    const k = endpointKey(mod, svc, name, protocol);
    out[k] = {
      module: mod.toLowerCase(),
      service: svc.toLowerCase(),
      name: name.toLowerCase(),
      protocol,
      address: endpointAddress(protocol, env[key] ?? ""),
      routes: [],
    };
  }
  return out;
}

function parseRoutes(endpoints: Record<string, ServiceEndpoint>): void {
  const env = envSource();
  for (const key of Object.keys(env)) {
    const m = key.match(ROUTE_RE);
    if (!m) continue;
    const [, mod, svc, name, pathRaw, methodRaw] = m;
    const k = endpointKey(mod, svc, name, "REST");
    const ep = endpoints[k];
    if (!ep) continue;
    const visibility = env[key] ?? "";
    const path = "/" + pathRaw.replace(/__/g, "/").toLowerCase();
    ep.routes.push({
      path,
      method: methodRaw.toUpperCase() as Route["method"],
      visibility,
    });
  }
}

/** Returns every endpoint visible via env vars, across all protocols.
 *  Evaluated every call — do NOT cache at module level. */
export function getEndpoints(): ServiceEndpoint[] {
  const endpoints = parseEndpoints();
  parseRoutes(endpoints);
  return Object.values(endpoints);
}

/** Filter getEndpoints() to a single protocol. Common for consumers that
 *  only care about REST (frontend fetches) or Connect (typed clients). */
export function getEndpointsByProtocol(protocol: Protocol): ServiceEndpoint[] {
  return getEndpoints().filter((e) => e.protocol === protocol);
}

export function getEndpointsByModule(): ModuleEndpoints[] {
  const map: Record<string, ModuleEndpoints> = {};
  for (const ep of getEndpoints()) {
    if (!map[ep.module]) map[ep.module] = { name: ep.module, services: [] };
    map[ep.module].services.push(ep);
  }
  return Object.values(map);
}

// Helper: find any env var whose key ends with the given suffix. The FE
// prefixes with NEXT_PUBLIC_ so the browser sees them; Node has bare
// CODEFLY__MODULE etc.
function findBySuffix(suffix: string): string {
  const env = envSource();
  const key = Object.keys(env).find((k) => k.endsWith(suffix));
  return key ? env[key] ?? "" : "";
}

export function getCurrentModule(): string {
  return findBySuffix("CODEFLY__MODULE");
}

export function getCurrentService(): string {
  return findBySuffix("CODEFLY__SERVICE");
}

export function getCurrentServiceVersion(): string {
  return findBySuffix("CODEFLY__SERVICE_VERSION");
}

/** Fixture selected by the Codefly runtime, or an empty string when none is active. */
export function getCurrentFixture(): string {
  return findBySuffix("CODEFLY__FIXTURE");
}
