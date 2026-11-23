"use strict";
// Env-var parsing. codefly injects `CODEFLY__ENDPOINT__<MODULE>__
// <SERVICE>__<NAME>__<PROTOCOL>=<url>` for every endpoint of every
// service a consumer depends on (including the service's own public HTTP
// endpoint). REST endpoints additionally get
// `CODEFLY__REST_ROUTE__<MODULE>__<SERVICE>__<NAME>__REST___<PATH>___<METHOD>`
// entries describing each route.
//
// The previous implementation ONLY parsed __REST suffixes, so Connect-ES
// and gRPC endpoints (heavily used in saas-starter) were invisible to
// the SDK. This module now recognizes all four protocols.
//
// Also previously: the parser did not decode Core's underscore-normalized
// component names, so `auth-sidecar` could not be selected by its canonical
// service name.
Object.defineProperty(exports, "__esModule", { value: true });
exports.unreadableEndpointCarriers = unreadableEndpointCarriers;
exports.getEndpoints = getEndpoints;
exports.getEndpointsByProtocol = getEndpointsByProtocol;
exports.getEndpointsByModule = getEndpointsByModule;
exports.getCurrentModule = getCurrentModule;
exports.getCurrentService = getCurrentService;
exports.getCurrentServiceVersion = getCurrentServiceVersion;
exports.getCurrentFixture = getCurrentFixture;
exports.isLocal = isLocal;
// Core encodes '-' as '_' inside components and uses '__' as the component
// delimiter. The regexp backtracks over the greedy component to the double
// separator; decodeComponent restores Codefly's canonical dash spelling.
const COMPONENT = "[A-Z0-9_-]+";
const ENDPOINT_RE = new RegExp(`CODEFLY__ENDPOINT__(${COMPONENT})__(${COMPONENT})__(${COMPONENT})__(HTTP|REST|CONNECT|GRPC)$`);
// REST-route env vars look like:
//   CODEFLY__REST_ROUTE__<MODULE>__<SERVICE>__<NAME>__REST___<PATH>___<METHOD>
// where <PATH> has `/` replaced with `__`. The three underscores before
// the path (___) distinguish path segments from the endpoint header.
const ROUTE_RE = new RegExp(`CODEFLY__REST_ROUTE__(${COMPONENT})__(${COMPONENT})__(${COMPONENT})__REST___(.+)___([A-Z]+)$`);
function endpointKey(module, service, name, protocol) {
    return `${module}:${service}:${name}:${protocol}`;
}
function decodeComponent(value) {
    return value.toLowerCase().replace(/_/g, "-");
}
function envSource() {
    // Always read fresh — the previous cached `_endpoints` const (populated
    // at module load time) was invisible to any env var set AFTER import.
    // Matters in test harnesses that set env then require() the SDK.
    return typeof process !== "undefined" && process.env
        ? process.env
        : {};
}
const BARE_HTTP_AUTHORITY = /^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\]):\d{1,5}$/;
/** Codefly's REST/Connect runtimes may expose either a URL or host:port.
 *  The SDK contract is a URL, so normalize the transport detail here once. */
function endpointAddress(protocol, value) {
    const address = value.trim();
    if ((protocol === "HTTP" || protocol === "REST" || protocol === "CONNECT") &&
        BARE_HTTP_AUTHORITY.test(address)) {
        return `http://${address}`;
    }
    return address;
}
// A carrier this SDK was handed and could not read.
//
// Absence and incapacity are not the same answer, and returning `[]` for both
// is what made the REST-only parser expensive rather than merely wrong: a
// consumer pointed at a Connect endpoint saw "this composition resolved no
// endpoints", which is a legitimate state, instead of "this SDK cannot read
// __CONNECT". The same rule is stated in sdk-go's WorkspaceValueIfSet —
// "Absence is an answer; a failed read is not."
//
// So anything carrying the endpoint prefix that the pattern does not match is
// reported once, rather than skipped in silence. It is a warning and not a
// throw: a consumer that genuinely does not need that endpoint must keep
// working, and this module is read during startup.
const ENDPOINT_PREFIX = "CODEFLY__ENDPOINT__";
const unreadable = new Set();
function reportUnreadable(key) {
    if (unreadable.has(key))
        return;
    unreadable.add(key);
    console.warn(`codefly: ${key} is an endpoint carrier this SDK cannot read, so it is not among getEndpoints(). ` +
        `Supported protocols are HTTP, REST, CONNECT and GRPC; a carrier naming another is invisible here rather than absent.`);
}
/** The carriers this SDK was given and could not read, for diagnostics. */
function unreadableEndpointCarriers() {
    return [...unreadable];
}
function parseEndpoints() {
    const env = envSource();
    const out = {};
    for (const key of Object.keys(env)) {
        const m = key.match(ENDPOINT_RE);
        if (!m) {
            if (key.startsWith(ENDPOINT_PREFIX))
                reportUnreadable(key);
            continue;
        }
        const [, mod, svc, name, protoRaw] = m;
        const protocol = protoRaw;
        const k = endpointKey(mod, svc, name, protocol);
        out[k] = {
            module: decodeComponent(mod),
            service: decodeComponent(svc),
            name: decodeComponent(name),
            protocol,
            address: endpointAddress(protocol, env[key] ?? ""),
            routes: [],
        };
    }
    return out;
}
function parseRoutes(endpoints) {
    const env = envSource();
    for (const key of Object.keys(env)) {
        const m = key.match(ROUTE_RE);
        if (!m)
            continue;
        const [, mod, svc, name, pathRaw, methodRaw] = m;
        const k = endpointKey(mod, svc, name, "REST");
        const ep = endpoints[k];
        if (!ep)
            continue;
        const visibility = env[key] ?? "";
        const path = "/" + pathRaw.replace(/__/g, "/").toLowerCase();
        ep.routes.push({
            path,
            method: methodRaw.toUpperCase(),
            visibility,
        });
    }
}
/** Returns every endpoint visible via env vars, across all protocols.
 *  Evaluated every call — do NOT cache at module level. */
function getEndpoints() {
    const endpoints = parseEndpoints();
    parseRoutes(endpoints);
    return Object.values(endpoints);
}
/** Filter getEndpoints() to a single protocol. Common for consumers that
 *  only care about REST (frontend fetches) or Connect (typed clients). */
function getEndpointsByProtocol(protocol) {
    return getEndpoints().filter((e) => e.protocol === protocol);
}
function getEndpointsByModule() {
    const map = {};
    for (const ep of getEndpoints()) {
        if (!map[ep.module])
            map[ep.module] = { name: ep.module, services: [] };
        map[ep.module].services.push(ep);
    }
    return Object.values(map);
}
// Helper: find any env var whose key ends with the given suffix. The FE
// prefixes with NEXT_PUBLIC_ so the browser sees them; Node has bare
// CODEFLY__MODULE etc.
function findBySuffix(suffix) {
    const env = envSource();
    const key = Object.keys(env).find((k) => k.endsWith(suffix));
    return key ? env[key] ?? "" : "";
}
function getCurrentModule() {
    return findBySuffix("CODEFLY__MODULE");
}
function getCurrentService() {
    return findBySuffix("CODEFLY__SERVICE");
}
function getCurrentServiceVersion() {
    return findBySuffix("CODEFLY__SERVICE_VERSION");
}
/** Fixture selected by the Codefly runtime, or an empty string when none is active. */
function getCurrentFixture() {
    return findBySuffix("CODEFLY__FIXTURE");
}
/** Whether Codefly launched this server in its local environment. */
function isLocal() {
    return envSource().CODEFLY__ENVIRONMENT?.toLowerCase() === "local";
}
//# sourceMappingURL=parsing.js.map