// Single source of truth for the SDK's domain types. The old
// `parsing.ts` carried a second set of Route/ServiceEndpoint/Module
// Endpoints definitions with subtly different fields (string vs Method,
// visibility vs no-visibility); importing from either produced
// slightly different types and quietly diverged. Everything now lives
// here and parsing.ts re-exports.

/** HTTP methods the routing table knows about. */
export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

/** Endpoint protocol. REST is plain HTTP; CONNECT is Connect-ES;
 *  GRPC is raw gRPC. Discovered via their own env-var suffixes. */
export type Protocol = "REST" | "CONNECT" | "GRPC";

export const httpMethods: Method[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

/** A single routable path on a REST endpoint. visibility is "public" or
 *  "private" — propagated from the agent so the frontend can surface
 *  only what's meant to be user-facing. */
export interface Route {
  path: string;
  method: Method;
  visibility: string;
}

/** A service endpoint as discovered from CODEFLY__ENDPOINT__… env vars.
 *  address is the base URL; routes are populated for REST endpoints via
 *  the CODEFLY__REST_ROUTE__… entries. For CONNECT/GRPC endpoints,
 *  routes stays empty and consumers call `address` directly. */
export interface ServiceEndpoint {
  module: string;
  service: string;
  name: string;
  protocol: Protocol;
  address: string;
  routes: Route[];
}

export interface ModuleEndpoints {
  name: string;
  services: ServiceEndpoint[];
}

export interface EndpointRequest {
  module?: string;
  service: string;
  path: string;
  method?: Method;
}

/** Select one declared service API without requiring a statically registered
 * route. This is the JS equivalent of Go's Module(...).Service(...).API(...)
 * network-instance lookup and is the correct boundary for plugin-owned routes. */
export interface NetworkInstanceRequest {
  module?: string;
  service: string;
  api: string;
  protocol?: Protocol;
}
