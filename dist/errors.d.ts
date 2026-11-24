export declare class RouteNotFoundError extends Error {
    constructor(method: string, path: string);
}
export declare class NetworkInstanceNotFoundError extends Error {
    readonly module: string;
    readonly service: string;
    readonly api: string;
    readonly protocol?: string;
    constructor(module: string, service: string, api: string, protocol?: string);
}
export declare class NetworkInstanceAmbiguousError extends Error {
    constructor(module: string, service: string, api: string);
}
/** withDependencies could not learn the address to probe: codefly resolved no
 *  endpoint of `api` for `service`. There is no fallback address — declare the
 *  endpoint on the service, name the service that has one with `readyService`,
 *  or pass `baseURL`. */
export declare class DependencyAddressUnresolvedError extends Error {
    readonly service: string;
    readonly api: string;
    readonly scope: string;
    constructor(service: string, api: string, scope: string);
}
//# sourceMappingURL=errors.d.ts.map