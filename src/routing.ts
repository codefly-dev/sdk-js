// URL resolution + a small typed fetch wrapper on top of the parsed
// endpoint table. Kept deliberately minimal — most consumers only need
// endpoint() or routing[method]() and write their own fetch.

import {
  EndpointRequest,
  Method,
  NetworkInstanceRequest,
  ServiceEndpoint,
  httpMethods,
} from "./types";
import {
  NetworkInstanceAmbiguousError,
  NetworkInstanceNotFoundError,
  RouteNotFoundError,
} from "./errors";
import { getCurrentModule, getEndpoints } from "./parsing";

// Exported keyed-by-method map for the `routing.GET(...)` call shape
// kept from v0.0.x.
export const routing: Record<
  Method,
  (
    module: string,
    service: string,
    path: string,
    endpoints?: ServiceEndpoint[],
  ) => string | null
> = {} as Record<Method, never>;

httpMethods.forEach((method) => {
  routing[method] = (module, service, path, endpoints) =>
    getEndpointUrl(method, module, service, path, endpoints);
});

/** Resolve a URL by `{ module?, service, path, method }`. Module
 *  defaults to the current one (CODEFLY__MODULE). Throws
 *  RouteNotFoundError when the route isn't registered — fail loud. */
export function endpoint(request: EndpointRequest): string {
  const method: Method = request.method ?? "GET";
  const module = request.module ?? getCurrentModule();
  const url = getEndpointUrl(method, module, request.service, request.path);
  if (!url) throw new RouteNotFoundError(method, request.path);
  return url;
}

export function getEndpointUrl(
  method: Method,
  module: string,
  service: string,
  path: string,
  serviceEndpoints?: ServiceEndpoint[],
): string | null {
  // Read endpoints per call — env can change in tests, and the previous
  // module-level const captured a stale snapshot at import time.
  const endpoints = serviceEndpoints ?? getEndpoints();

  const match = endpoints.find(
    (ep) =>
      ep.service === service && ep.module === module && ep.protocol === "REST",
  );
  if (!match) return null;

  const route = match.routes.find(
    (r) => r.path === path && r.method.toUpperCase() === method.toUpperCase(),
  );
  if (!route) return null;

  return match.address ? `${match.address}${path}` : null;
}

/** Resolve one declared service API to its injected network instance.
 *
 * Unlike endpoint(), this does not require a route to be present in Codefly's
 * static route catalog. Product SDKs use it for routes contributed dynamically
 * by a service plugin, while Codefly remains the sole owner of endpoint
 * discovery and carrier parsing.
 */
export function networkInstance(
  request: NetworkInstanceRequest,
): ServiceEndpoint {
  const module = (request.module ?? getCurrentModule()).trim().toLowerCase();
  const service = request.service.trim().toLowerCase();
  const api = request.api.trim().toLowerCase();
  const matches = getEndpoints().filter(
    (candidate) =>
      candidate.module === module &&
      candidate.service === service &&
      candidate.name === api &&
      (request.protocol === undefined ||
        candidate.protocol === request.protocol),
  );
  if (matches.length === 0) {
    throw new NetworkInstanceNotFoundError(
      module,
      service,
      api,
      request.protocol,
    );
  }
  if (matches.length > 1) {
    throw new NetworkInstanceAmbiguousError(module, service, api);
  }
  const [match] = matches;
  if (match.address.trim() === "") {
    throw new NetworkInstanceNotFoundError(
      module,
      service,
      api,
      request.protocol,
    );
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

export class HttpError extends Error {
  readonly status: number;
  readonly body: string;
  readonly url: string;
  constructor(url: string, status: number, body: string) {
    super(`${url} → ${status}`);
    this.name = "HttpError";
    this.url = url;
    this.status = status;
    this.body = body;
  }
}

export interface FetchEndpointOptions extends EndpointRequest {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  body?: unknown;
  /** Default 30s. Caller can also pass `signal` for full control. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** endpoint() + fetch + JSON decode + a useful error on non-2xx. */
export async function fetchEndpoint<T = unknown>(
  options: FetchEndpointOptions,
): Promise<T> {
  let url = endpoint(options);
  if (options.params) {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(options.params).map(([k, v]) => [k, String(v)]),
      ),
    );
    url += (url.includes("?") ? "&" : "?") + qs.toString();
  }

  // Compose signal: a user-provided abort takes precedence; otherwise
  // we install a timeout. Keeps callers with their own cancellation
  // story in control.
  const controller = options.signal ? undefined : new AbortController();
  const timer = controller
    ? setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000)
    : undefined;

  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body:
        options.body !== undefined && options.body !== null
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
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
