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
//# sourceMappingURL=errors.d.ts.map