// Public surface of the codefly JS SDK.

// Types (single source of truth lives in ./types).
export type {
  Method,
  Protocol,
  Route,
  ServiceEndpoint,
  ModuleEndpoints,
  EndpointRequest,
} from "./types";
export { httpMethods } from "./types";

// Env-var parsing + introspection.
export {
  getEndpoints,
  getEndpointsByProtocol,
  getEndpointsByModule,
  getCurrentModule,
  getCurrentService,
  getCurrentServiceVersion,
  getCurrentFixture,
} from "./parsing";

// URL resolution + typed fetch.
export {
  routing,
  endpoint,
  getEndpointUrl,
  fetchEndpoint,
  HttpError,
} from "./routing";
export type { FetchEndpointOptions } from "./routing";

// Errors.
export { RouteNotFoundError } from "./errors";

// Test-harness integration: JS equivalent of Go's sdk.WithDependencies.
export { withDependencies } from "./dependencies";
export type {
  WithDependenciesOptions,
  Dependencies,
} from "./dependencies";

// Endpoint address resolution (workspace-correct ports via codefly).
export {
  resolveServiceAddress,
  resolveServiceAddressSync,
} from "./resolve";
export type { EndpointProtocol, ResolveOptions } from "./resolve";

// Typed settings/preferences helpers.
export {
  settings,
  settingKey,
  getSetting,
  setSetting,
  settingUpdate,
  setSettings,
  assignSetting,
  mergeSettingPatch,
  createSettingsStore,
} from "./settings";
export type {
  DeepPartial,
  SettingKey,
  SettingKeyOptions,
  SettingPath,
  SettingUpdate,
  SettingsStore,
  SettingsStoreOptions,
} from "./settings";
