import { EndpointRequest, Method, NetworkInstanceRequest, ServiceEndpoint } from "./types";
export declare const routing: Record<Method, (module: string, service: string, path: string, endpoints?: ServiceEndpoint[]) => string | null>;
/** Resolve a URL by `{ module?, service, path, method }`. Module
 *  defaults to the current one (CODEFLY__MODULE). Throws
 *  RouteNotFoundError when the route isn't registered — fail loud. */
export declare function endpoint(request: EndpointRequest): string;
export declare function getEndpointUrl(method: Method, module: string, service: string, path: string, serviceEndpoints?: ServiceEndpoint[]): string | null;
/** Resolve one declared service API to its injected network instance.
 *
 * Unlike endpoint(), this does not require a route to be present in Codefly's
 * static route catalog. Product SDKs use it for routes contributed dynamically
 * by a service plugin, while Codefly remains the sole owner of endpoint
 * discovery and carrier parsing.
 */
export declare function networkInstance(request: NetworkInstanceRequest): ServiceEndpoint;
export declare class HttpError extends Error {
    readonly status: number;
    readonly body: string;
    readonly url: string;
    constructor(url: string, status: number, body: string);
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
export declare function fetchEndpoint<T = unknown>(options: FetchEndpointOptions): Promise<T>;
//# sourceMappingURL=routing.d.ts.map