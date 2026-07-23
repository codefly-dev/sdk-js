"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkInstanceAmbiguousError = exports.NetworkInstanceNotFoundError = exports.RouteNotFoundError = void 0;
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
//# sourceMappingURL=errors.js.map