"use strict";
// Single source of truth for the SDK's domain types. The old
// `parsing.ts` carried a second set of Route/ServiceEndpoint/Module
// Endpoints definitions with subtly different fields (string vs Method,
// visibility vs no-visibility); importing from either produced
// slightly different types and quietly diverged. Everything now lives
// here and parsing.ts re-exports.
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpMethods = void 0;
exports.httpMethods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
];
//# sourceMappingURL=types.js.map