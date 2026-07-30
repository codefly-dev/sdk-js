// Unit tests for the env-var parsing + routing layer.
// Each test resets process.env to a clean slate so tests are order-
// independent, and uses require() to re-import modules after the env
// mutation so the freshly-evaluated module sees the test's vars.

import {
  getCurrentModule,
  getCurrentService,
  getCurrentServiceVersion,
  getCurrentFixture,
} from "../parsing";

const url = "http://localhost:8080";

describe("codefly getEndpointUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves a REST route by module/service/path", () => {
    process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
    process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___USERS__BACKEND__VERSION___GET =
      "public";
    const { getEndpointUrl } = require("../routing");
    expect(
      getEndpointUrl("GET", "public", "api", "/users/backend/version"),
    ).toEqual(`${url}/users/backend/version`);
  });

  it("resolves the same URL with a NEXT_PUBLIC_ prefix", () => {
    process.env.NEXT_PUBLIC_CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
    process.env.NEXT_PUBLIC_CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___USERS__BACKEND__VERSION___GET =
      "public";
    const { getEndpointUrl, endpoint } = require("../routing");
    expect(
      getEndpointUrl("GET", "public", "api", "/users/backend/version"),
    ).toEqual(`${url}/users/backend/version`);
    expect(
      endpoint({
        module: "public",
        service: "api",
        path: "/users/backend/version",
        method: "GET",
      }),
    ).toEqual(`${url}/users/backend/version`);
  });

  it("returns null when the method doesn't match a registered route", () => {
    process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
    process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___USERS__BACKEND__VERSION___GET =
      "public";
    const { getEndpointUrl } = require("../routing");
    expect(
      getEndpointUrl("POST", "public", "api", "/users/backend/version"),
    ).toBeNull();
  });

  it("defaults module from CODEFLY__MODULE when endpoint() omits it", () => {
    process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
    process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___USERS__BACKEND__VERSION___GET =
      "public";
    process.env.CODEFLY__MODULE = "public";
    const { endpoint } = require("../routing");
    expect(
      endpoint({
        service: "api",
        path: "/users/backend/version",
        method: "GET",
      }),
    ).toEqual(`${url}/users/backend/version`);
  });

  // Connect/gRPC protocols — the old parser only understood REST, so
  // Connect-ES clients couldn't discover their endpoint via the SDK.
  it("exposes CONNECT endpoints via getEndpointsByProtocol", () => {
    process.env.CODEFLY__ENDPOINT__PUBLIC__API__RPC__CONNECT =
      "localhost:9090";
    const { getEndpointsByProtocol } = require("../parsing");
    const connects = getEndpointsByProtocol("CONNECT");
    expect(connects).toHaveLength(1);
    expect(connects[0].address).toEqual("http://localhost:9090");
    expect(connects[0].protocol).toEqual("CONNECT");
  });

  it("exposes GRPC endpoints alongside REST", () => {
    process.env.CODEFLY__ENDPOINT__PUBLIC__API__GRPC__GRPC =
      "dns:///api.local:50051";
    const { getEndpointsByProtocol } = require("../parsing");
    const grpcs = getEndpointsByProtocol("GRPC");
    expect(grpcs).toHaveLength(1);
    expect(grpcs[0].protocol).toEqual("GRPC");
  });

  it("exposes the service's generic HTTP endpoint with canonical names", () => {
    process.env.CODEFLY__ENDPOINT__MODULE_SAAS_STARTER__FRONTEND__HTTP__HTTP =
      "localhost:42152";
    const { getEndpointsByProtocol } = require("../parsing");
    expect(getEndpointsByProtocol("HTTP")).toEqual([
      expect.objectContaining({
        module: "module-saas-starter",
        service: "frontend",
        name: "http",
        protocol: "HTTP",
        address: "http://localhost:42152",
      }),
    ]);
  });

  it("decodes normalized service names in dependency endpoints", () => {
    process.env.CODEFLY__ENDPOINT__SAAS_STARTER__AUTH_SIDECAR__REST__REST =
      "localhost:8080";
    const { getEndpoints } = require("../parsing");
    expect(getEndpoints()).toEqual([
      expect.objectContaining({
        module: "saas-starter",
        service: "auth-sidecar",
        name: "rest",
      }),
    ]);
  });

  it("resolves a plugin-capable REST network instance without a route", () => {
    process.env.CODEFLY__ENDPOINT__PLATFORM__WARDEN__REST__REST = url;
    const { networkInstance } = require("../routing");
    expect(
      networkInstance({
        module: "platform",
        service: "warden",
        api: "rest",
        protocol: "REST",
      }).address,
    ).toEqual(url);
  });

  it("fails closed when a network instance is missing", () => {
    const {
      networkInstance,
    } = require("../routing");
    const {
      NetworkInstanceNotFoundError,
    } = require("../errors");
    expect(() =>
      networkInstance({
        module: "platform",
        service: "warden",
        api: "rest",
        protocol: "REST",
      }),
    ).toThrow(NetworkInstanceNotFoundError);
  });

  it("requires a protocol when an API name is ambiguous", () => {
    process.env.CODEFLY__ENDPOINT__PLATFORM__WARDEN__RPC__CONNECT =
      "localhost:9090";
    process.env.CODEFLY__ENDPOINT__PLATFORM__WARDEN__RPC__GRPC =
      "dns:///warden.local:9090";
    const {
      networkInstance,
    } = require("../routing");
    const {
      NetworkInstanceAmbiguousError,
    } = require("../errors");
    expect(() =>
      networkInstance({
        module: "platform",
        service: "warden",
        api: "rpc",
      }),
    ).toThrow(NetworkInstanceAmbiguousError);
  });

  it("re-reads env on every call (no module-level cache)", () => {
    // First resolution sees nothing.
    const { getEndpointUrl } = require("../routing");
    expect(getEndpointUrl("GET", "public", "api", "/health")).toBeNull();

    // Set env AFTER import — the next call must see it.
    process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
    process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___HEALTH___GET =
      "public";
    expect(getEndpointUrl("GET", "public", "api", "/health")).toEqual(
      `${url}/health`,
    );
  });
});

describe("workspace configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads public and secret values through the SDK boundary", () => {
    process.env.CODEFLY__WORKSPACE_CONFIGURATION__SECURITY__PUBLIC_SETTING =
      "public";
    process.env.CODEFLY__WORKSPACE_SECRET_CONFIGURATION__SECURITY__SECRET_SETTING =
      "secret";
    const {
      getWorkspaceConfiguration,
      getWorkspaceSecret,
    } = require("../configuration");
    expect(getWorkspaceConfiguration("security", "public-setting")).toBe(
      "public",
    );
    expect(getWorkspaceSecret("security", "secret-setting")).toBe("secret");
  });

  it("prefers exact names and accepts Codefly-normalized names", () => {
    process.env.CODEFLY__WORKSPACE_CONFIGURATION__INTERNAL_AUTH__TOKEN =
      "normalized";
    process.env["CODEFLY__WORKSPACE_CONFIGURATION__INTERNAL-AUTH__TOKEN"] =
      "exact";
    process.env.CODEFLY__WORKSPACE_SECRET_CONFIGURATION__INTERNAL_AUTH__FALLBACK =
      "normalized-secret";
    const {
      getWorkspaceConfiguration,
      getWorkspaceSecret,
    } = require("../configuration");
    expect(getWorkspaceConfiguration("internal-auth", "token")).toBe("exact");
    expect(getWorkspaceSecret("internal-auth", "fallback")).toBe(
      "normalized-secret",
    );
  });

  it("resolves public before secret and re-reads configuration each call", () => {
    process.env.CODEFLY__WORKSPACE_SECRET_CONFIGURATION__IDENTITY__MODE =
      "secret";
    const { getWorkspaceValue } = require("../configuration");
    expect(getWorkspaceValue("identity", "mode")).toBe("secret");
    process.env.CODEFLY__WORKSPACE_CONFIGURATION__IDENTITY__MODE = "public";
    expect(getWorkspaceValue("identity", "mode")).toBe("public");
  });

  it("returns undefined for absent or blank values", () => {
    process.env.CODEFLY__WORKSPACE_CONFIGURATION__SECURITY__EMPTY = "  ";
    const { getWorkspaceConfiguration } = require("../configuration");
    expect(getWorkspaceConfiguration("security", "missing")).toBeUndefined();
    expect(getWorkspaceConfiguration("security", "empty")).toBeUndefined();
  });
});

describe("getCurrentModule", () => {
  beforeEach(() => {
    process.env = {};
  });

  it("reads bare CODEFLY__MODULE", () => {
    process.env.CODEFLY__MODULE = "mymodule";
    expect(getCurrentModule()).toBe("mymodule");
  });

  it("reads prefixed NEXT_PUBLIC_CODEFLY__MODULE", () => {
    process.env.NEXT_PUBLIC_CODEFLY__MODULE = "mymodule";
    expect(getCurrentModule()).toBe("mymodule");
  });

  it("returns empty string when not set", () => {
    expect(getCurrentModule()).toBe("");
  });
});

describe("getCurrentService", () => {
  beforeEach(() => {
    process.env = {};
  });

  it("reads bare CODEFLY__SERVICE", () => {
    process.env.CODEFLY__SERVICE = "myservice";
    expect(getCurrentService()).toBe("myservice");
  });

  it("reads prefixed NEXT_PUBLIC_CODEFLY__SERVICE", () => {
    process.env.NEXT_PUBLIC_CODEFLY__SERVICE = "myservice";
    expect(getCurrentService()).toBe("myservice");
  });

  it("returns empty string when not set", () => {
    expect(getCurrentService()).toBe("");
  });
});

describe("getCurrentServiceVersion", () => {
  beforeEach(() => {
    process.env = {};
  });

  it("reads bare CODEFLY__SERVICE_VERSION", () => {
    process.env.CODEFLY__SERVICE_VERSION = "v1";
    expect(getCurrentServiceVersion()).toBe("v1");
  });

  it("reads prefixed NEXT_PUBLIC_CODEFLY__SERVICE_VERSION", () => {
    process.env.NEXT_PUBLIC_CODEFLY__SERVICE_VERSION = "v2";
    expect(getCurrentServiceVersion()).toBe("v2");
  });

  it("returns empty string when not set", () => {
    expect(getCurrentServiceVersion()).toBe("");
  });
});

describe("getCurrentFixture", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns the fixture selected by Codefly", () => {
    process.env = { CODEFLY__FIXTURE: "codefly" };
    expect(getCurrentFixture()).toBe("codefly");
  });

  it("returns an empty string when no fixture is selected", () => {
    process.env = {};
    expect(getCurrentFixture()).toBe("");
  });
});
