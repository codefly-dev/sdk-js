"use strict";
// Public surface of the codefly JS SDK.
Object.defineProperty(exports, "__esModule", { value: true });
exports.workContextFromHeaders = exports.withWorkContext = exports.parseWorkContextToken = exports.attachWorkContext = exports.WorkContextVerifier = exports.WorkContextToken = exports.WorkContextSigner = exports.WorkContextError = exports.WORK_CONTEXT_TYPE = exports.WORK_CONTEXT_REPLAY_SINGLE_USE = exports.WORK_CONTEXT_REPLAY_IDEMPOTENT = exports.WORK_CONTEXT_MAX_TTL_SECONDS = exports.WORK_CONTEXT_MAX_TOKEN_BYTES = exports.WORK_CONTEXT_MAX_ACTOR_DEPTH = exports.WORK_CONTEXT_HEADER_NAME = exports.WORK_CONTEXT_DEFAULT_TTL_SECONDS = exports.WORK_CONTEXT_CLOCK_SKEW_SECONDS = exports.WORK_CONTEXT_ALGORITHM = exports.createSettingsStore = exports.mergeSettingPatch = exports.assignSetting = exports.setSettings = exports.settingUpdate = exports.setSetting = exports.getSetting = exports.settingKey = exports.settings = exports.resolveServiceAddressSync = exports.resolveServiceAddress = exports.withDependencies = exports.RouteNotFoundError = exports.NetworkInstanceNotFoundError = exports.NetworkInstanceAmbiguousError = exports.HttpError = exports.networkInstance = exports.fetchEndpoint = exports.getEndpointUrl = exports.endpoint = exports.routing = exports.getCurrentFixture = exports.getCurrentServiceVersion = exports.getCurrentService = exports.getCurrentModule = exports.getEndpointsByModule = exports.getEndpointsByProtocol = exports.getEndpoints = exports.httpMethods = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "httpMethods", { enumerable: true, get: function () { return types_1.httpMethods; } });
// Env-var parsing + introspection.
var parsing_1 = require("./parsing");
Object.defineProperty(exports, "getEndpoints", { enumerable: true, get: function () { return parsing_1.getEndpoints; } });
Object.defineProperty(exports, "getEndpointsByProtocol", { enumerable: true, get: function () { return parsing_1.getEndpointsByProtocol; } });
Object.defineProperty(exports, "getEndpointsByModule", { enumerable: true, get: function () { return parsing_1.getEndpointsByModule; } });
Object.defineProperty(exports, "getCurrentModule", { enumerable: true, get: function () { return parsing_1.getCurrentModule; } });
Object.defineProperty(exports, "getCurrentService", { enumerable: true, get: function () { return parsing_1.getCurrentService; } });
Object.defineProperty(exports, "getCurrentServiceVersion", { enumerable: true, get: function () { return parsing_1.getCurrentServiceVersion; } });
Object.defineProperty(exports, "getCurrentFixture", { enumerable: true, get: function () { return parsing_1.getCurrentFixture; } });
// URL resolution + typed fetch.
var routing_1 = require("./routing");
Object.defineProperty(exports, "routing", { enumerable: true, get: function () { return routing_1.routing; } });
Object.defineProperty(exports, "endpoint", { enumerable: true, get: function () { return routing_1.endpoint; } });
Object.defineProperty(exports, "getEndpointUrl", { enumerable: true, get: function () { return routing_1.getEndpointUrl; } });
Object.defineProperty(exports, "fetchEndpoint", { enumerable: true, get: function () { return routing_1.fetchEndpoint; } });
Object.defineProperty(exports, "networkInstance", { enumerable: true, get: function () { return routing_1.networkInstance; } });
Object.defineProperty(exports, "HttpError", { enumerable: true, get: function () { return routing_1.HttpError; } });
// Errors.
var errors_1 = require("./errors");
Object.defineProperty(exports, "NetworkInstanceAmbiguousError", { enumerable: true, get: function () { return errors_1.NetworkInstanceAmbiguousError; } });
Object.defineProperty(exports, "NetworkInstanceNotFoundError", { enumerable: true, get: function () { return errors_1.NetworkInstanceNotFoundError; } });
Object.defineProperty(exports, "RouteNotFoundError", { enumerable: true, get: function () { return errors_1.RouteNotFoundError; } });
// Test-harness integration: JS equivalent of Go's sdk.WithDependencies.
var dependencies_1 = require("./dependencies");
Object.defineProperty(exports, "withDependencies", { enumerable: true, get: function () { return dependencies_1.withDependencies; } });
// Endpoint address resolution (workspace-correct ports via codefly).
var resolve_1 = require("./resolve");
Object.defineProperty(exports, "resolveServiceAddress", { enumerable: true, get: function () { return resolve_1.resolveServiceAddress; } });
Object.defineProperty(exports, "resolveServiceAddressSync", { enumerable: true, get: function () { return resolve_1.resolveServiceAddressSync; } });
// Typed settings/preferences helpers.
var settings_1 = require("./settings");
Object.defineProperty(exports, "settings", { enumerable: true, get: function () { return settings_1.settings; } });
Object.defineProperty(exports, "settingKey", { enumerable: true, get: function () { return settings_1.settingKey; } });
Object.defineProperty(exports, "getSetting", { enumerable: true, get: function () { return settings_1.getSetting; } });
Object.defineProperty(exports, "setSetting", { enumerable: true, get: function () { return settings_1.setSetting; } });
Object.defineProperty(exports, "settingUpdate", { enumerable: true, get: function () { return settings_1.settingUpdate; } });
Object.defineProperty(exports, "setSettings", { enumerable: true, get: function () { return settings_1.setSettings; } });
Object.defineProperty(exports, "assignSetting", { enumerable: true, get: function () { return settings_1.assignSetting; } });
Object.defineProperty(exports, "mergeSettingPatch", { enumerable: true, get: function () { return settings_1.mergeSettingPatch; } });
Object.defineProperty(exports, "createSettingsStore", { enumerable: true, get: function () { return settings_1.createSettingsStore; } });
// Signed, audience-bound Task/Session authority propagation.
var work_context_1 = require("./work-context");
Object.defineProperty(exports, "WORK_CONTEXT_ALGORITHM", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_ALGORITHM; } });
Object.defineProperty(exports, "WORK_CONTEXT_CLOCK_SKEW_SECONDS", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_CLOCK_SKEW_SECONDS; } });
Object.defineProperty(exports, "WORK_CONTEXT_DEFAULT_TTL_SECONDS", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_DEFAULT_TTL_SECONDS; } });
Object.defineProperty(exports, "WORK_CONTEXT_HEADER_NAME", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_HEADER_NAME; } });
Object.defineProperty(exports, "WORK_CONTEXT_MAX_ACTOR_DEPTH", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_MAX_ACTOR_DEPTH; } });
Object.defineProperty(exports, "WORK_CONTEXT_MAX_TOKEN_BYTES", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_MAX_TOKEN_BYTES; } });
Object.defineProperty(exports, "WORK_CONTEXT_MAX_TTL_SECONDS", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_MAX_TTL_SECONDS; } });
Object.defineProperty(exports, "WORK_CONTEXT_REPLAY_IDEMPOTENT", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_REPLAY_IDEMPOTENT; } });
Object.defineProperty(exports, "WORK_CONTEXT_REPLAY_SINGLE_USE", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_REPLAY_SINGLE_USE; } });
Object.defineProperty(exports, "WORK_CONTEXT_TYPE", { enumerable: true, get: function () { return work_context_1.WORK_CONTEXT_TYPE; } });
Object.defineProperty(exports, "WorkContextError", { enumerable: true, get: function () { return work_context_1.WorkContextError; } });
Object.defineProperty(exports, "WorkContextSigner", { enumerable: true, get: function () { return work_context_1.WorkContextSigner; } });
Object.defineProperty(exports, "WorkContextToken", { enumerable: true, get: function () { return work_context_1.WorkContextToken; } });
Object.defineProperty(exports, "WorkContextVerifier", { enumerable: true, get: function () { return work_context_1.WorkContextVerifier; } });
Object.defineProperty(exports, "attachWorkContext", { enumerable: true, get: function () { return work_context_1.attachWorkContext; } });
Object.defineProperty(exports, "parseWorkContextToken", { enumerable: true, get: function () { return work_context_1.parseWorkContextToken; } });
Object.defineProperty(exports, "withWorkContext", { enumerable: true, get: function () { return work_context_1.withWorkContext; } });
Object.defineProperty(exports, "workContextFromHeaders", { enumerable: true, get: function () { return work_context_1.workContextFromHeaders; } });
//# sourceMappingURL=index.js.map