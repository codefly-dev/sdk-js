// Public surface of the codefly JS SDK.

// Types (single source of truth lives in ./types).
export type {
  Method,
  Protocol,
  Route,
  ServiceEndpoint,
  ModuleEndpoints,
  EndpointRequest,
  NetworkInstanceRequest,
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
  networkInstance,
  HttpError,
} from "./routing";
export type { FetchEndpointOptions } from "./routing";

// Errors.
export {
  NetworkInstanceAmbiguousError,
  NetworkInstanceNotFoundError,
  RouteNotFoundError,
} from "./errors";

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

// Signed, audience-bound Task/Session authority propagation.
export {
  WORK_CONTEXT_ALGORITHM,
  WORK_CONTEXT_CLOCK_SKEW_SECONDS,
  WORK_CONTEXT_DEFAULT_TTL_SECONDS,
  WORK_CONTEXT_HEADER_NAME,
  WORK_CONTEXT_MAX_ACTOR_DEPTH,
  WORK_CONTEXT_MAX_TOKEN_BYTES,
  WORK_CONTEXT_MAX_TTL_SECONDS,
  WORK_CONTEXT_REPLAY_IDEMPOTENT,
  WORK_CONTEXT_REPLAY_SINGLE_USE,
  WORK_CONTEXT_TYPE,
  WorkContextError,
  WorkContextSigner,
  WorkContextToken,
  WorkContextVerifier,
  attachWorkContext,
  parseWorkContextToken,
  withWorkContext,
  workContextFromHeaders,
} from "./work-context";
export type {
  StartChildSessionInput,
  StartSessionInput,
  StartTaskInput,
  WorkActorV1,
  WorkContextExpectations,
  WorkContextHeaders,
  WorkContextKeyLike,
  WorkContextReplayPolicy,
  WorkContextSignerOptions,
  WorkContextV1,
  WorkContextVerifierOptions,
  WorkScopeV1,
} from "./work-context";
