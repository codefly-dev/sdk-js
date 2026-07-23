import { ModuleEndpoints, Protocol, ServiceEndpoint } from "./types";
export type { ModuleEndpoints, Route, ServiceEndpoint } from "./types";
/** Returns every endpoint visible via env vars, across all protocols.
 *  Evaluated every call — do NOT cache at module level. */
export declare function getEndpoints(): ServiceEndpoint[];
/** Filter getEndpoints() to a single protocol. Common for consumers that
 *  only care about REST (frontend fetches) or Connect (typed clients). */
export declare function getEndpointsByProtocol(protocol: Protocol): ServiceEndpoint[];
export declare function getEndpointsByModule(): ModuleEndpoints[];
export declare function getCurrentModule(): string;
export declare function getCurrentService(): string;
export declare function getCurrentServiceVersion(): string;
/** Fixture selected by the Codefly runtime, or an empty string when none is active. */
export declare function getCurrentFixture(): string;
//# sourceMappingURL=parsing.d.ts.map