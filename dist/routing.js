"use strict";
// URL resolution + a small typed fetch wrapper on top of the parsed
// endpoint table. Kept deliberately minimal — most consumers only need
// endpoint() or routing[method]() and write their own fetch.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = exports.routing = void 0;
exports.endpoint = endpoint;
exports.getEndpointUrl = getEndpointUrl;
exports.networkInstance = networkInstance;
exports.fetchEndpoint = fetchEndpoint;
const types_1 = require("./types");
const errors_1 = require("./errors");
const parsing_1 = require("./parsing");
// Exported keyed-by-method map for the `routing.GET(...)` call shape
// kept from v0.0.x.
exports.routing = {};
types_1.httpMethods.forEach((method) => {
    exports.routing[method] = (module, service, path, endpoints) => getEndpointUrl(method, module, service, path, endpoints);
});
/** Resolve a URL by `{ module?, service, path, method }`. Module
 *  defaults to the current one (CODEFLY__MODULE). Throws
 *  RouteNotFoundError when the route isn't registered — fail loud. */
function endpoint(request) {
    const method = request.method ?? "GET";
    const module = request.module ?? (0, parsing_1.getCurrentModule)();
    const url = getEndpointUrl(method, module, request.service, request.path);
    if (!url)
        throw new errors_1.RouteNotFoundError(method, request.path);
    return url;
}
function getEndpointUrl(method, module, service, path, serviceEndpoints) {
    // Read endpoints per call — env can change in tests, and the previous
    // module-level const captured a stale snapshot at import time.
    const endpoints = serviceEndpoints ?? (0, parsing_1.getEndpoints)();
    const match = endpoints.find((ep) => ep.service === service && ep.module === module && ep.protocol === "REST");
    if (!match)
        return null;
    const route = match.routes.find((r) => r.path === path && r.method.toUpperCase() === method.toUpperCase());
    if (!route)
        return null;
    return match.address ? `${match.address}${path}` : null;
}
/** Resolve one declared service API to its injected network instance.
 *
 * Unlike endpoint(), this does not require a route to be present in Codefly's
 * static route catalog. Product SDKs use it for routes contributed dynamically
 * by a service plugin, while Codefly remains the sole owner of endpoint
 * discovery and carrier parsing.
 */
function networkInstance(request) {
    const module = (request.module ?? (0, parsing_1.getCurrentModule)()).trim().toLowerCase();
    const service = request.service.trim().toLowerCase();
    const api = request.api.trim().toLowerCase();
    const matches = (0, parsing_1.getEndpoints)().filter((candidate) => candidate.module === module &&
        candidate.service === service &&
        candidate.name === api &&
        (request.protocol === undefined ||
            candidate.protocol === request.protocol));
    if (matches.length === 0) {
        throw new errors_1.NetworkInstanceNotFoundError(module, service, api, request.protocol);
    }
    if (matches.length > 1) {
        throw new errors_1.NetworkInstanceAmbiguousError(module, service, api);
    }
    const [match] = matches;
    if (match.address.trim() === "") {
        throw new errors_1.NetworkInstanceNotFoundError(module, service, api, request.protocol);
    }
    return match;
}
// -- fetchEndpoint --------------------------------------------------------
//
// Lean typed fetch. The previous version swallowed status codes in a
// generic Error ("HTTP error! status: ..."), had no timeout, no abort
// support, and no response-body exposure on failure. Replaced with
// something usable in production without callers having to rebuild
// it from scratch.
class HttpError extends Error {
    constructor(url, status, body) {
        super(`${url} → ${status}`);
        this.name = "HttpError";
        this.url = url;
        this.status = status;
        this.body = body;
    }
}
exports.HttpError = HttpError;
/** endpoint() + fetch + JSON decode + a useful error on non-2xx. */
async function fetchEndpoint(options) {
    let url = endpoint(options);
    if (options.params) {
        const qs = new URLSearchParams(Object.fromEntries(Object.entries(options.params).map(([k, v]) => [k, String(v)])));
        url += (url.includes("?") ? "&" : "?") + qs.toString();
    }
    // Compose signal: a user-provided abort takes precedence; otherwise
    // we install a timeout. Keeps callers with their own cancellation
    // story in control.
    const controller = options.signal ? undefined : new AbortController();
    const timer = controller
        ? setTimeout(() => controller.abort(), options.timeoutMs ?? 30000)
        : undefined;
    try {
        const res = await fetch(url, {
            method: options.method ?? "GET",
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            body: options.body !== undefined && options.body !== null
                ? typeof options.body === "string"
                    ? options.body
                    : JSON.stringify(options.body)
                : undefined,
            signal: options.signal ?? controller?.signal,
        });
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new HttpError(url, res.status, body);
        }
        if (res.status === 204)
            return undefined;
        return (await res.json());
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
//# sourceMappingURL=routing.js.map