"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyAddressUnresolvedError = exports.NetworkInstanceAmbiguousError = exports.NetworkInstanceNotFoundError = exports.RouteNotFoundError = void 0;
class RouteNotFoundError extends Error {
    constructor(method, path) {
        super(`Route not found: ${method} ${path}`);
        this.name = "RouteNotFoundError";
    }
}
exports.RouteNotFoundError = RouteNotFoundError;
class NetworkInstanceNotFoundError extends Error {
    constructor(module, service, api, protocol) {
        const target = [module, service, api, protocol]
            .filter((value) => value !== undefined && value !== "")
            .join("/");
        super(`Codefly network instance not found: ${target}`);
        this.name = "NetworkInstanceNotFoundError";
        this.module = module;
        this.service = service;
        this.api = api;
        this.protocol = protocol;
    }
}
exports.NetworkInstanceNotFoundError = NetworkInstanceNotFoundError;
class NetworkInstanceAmbiguousError extends Error {
    constructor(module, service, api) {
        super(`Codefly network instance is ambiguous: ${module}/${service}/${api}; specify protocol`);
        this.name = "NetworkInstanceAmbiguousError";
    }
}
exports.NetworkInstanceAmbiguousError = NetworkInstanceAmbiguousError;
/** withDependencies could not learn the address to probe: codefly resolved no
 *  endpoint of `api` for `service`. There is no fallback address — declare the
 *  endpoint on the service, name the service that has one with `readyService`,
 *  or pass `baseURL`. */
class DependencyAddressUnresolvedError extends Error {
    constructor(service, api, scope) {
        const within = scope === "" ? "" : ` in naming scope "${scope}"`;
        super(`withDependencies: codefly resolved no ${api} endpoint address for dependency "${service}"${within} ` +
            `(codefly get endpoints ${service} --type ${api}). ` +
            `Declare that endpoint, set readyService to a service that has one, or pass baseURL.`);
        this.name = "DependencyAddressUnresolvedError";
        this.service = service;
        this.api = api;
        this.scope = scope;
    }
}
exports.DependencyAddressUnresolvedError = DependencyAddressUnresolvedError;
//# sourceMappingURL=errors.js.map