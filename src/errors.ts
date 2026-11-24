export class RouteNotFoundError extends Error {
  constructor(method: string, path: string) {
    super(`Route not found: ${method} ${path}`);
    this.name = "RouteNotFoundError";
  }
}

export class NetworkInstanceNotFoundError extends Error {
  readonly module: string;
  readonly service: string;
  readonly api: string;
  readonly protocol?: string;

  constructor(
    module: string,
    service: string,
    api: string,
    protocol?: string,
  ) {
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

export class NetworkInstanceAmbiguousError extends Error {
  constructor(module: string, service: string, api: string) {
    super(
      `Codefly network instance is ambiguous: ${module}/${service}/${api}; specify protocol`,
    );
    this.name = "NetworkInstanceAmbiguousError";
  }
}

/** withDependencies could not learn the address to probe: codefly resolved no
 *  endpoint of `api` for `service`. There is no fallback address — declare the
 *  endpoint on the service, name the service that has one with `readyService`,
 *  or pass `baseURL`. */
export class DependencyAddressUnresolvedError extends Error {
  readonly service: string;
  readonly api: string;
  readonly scope: string;

  constructor(service: string, api: string, scope: string) {
    const within = scope === "" ? "" : ` in naming scope "${scope}"`;
    super(
      `withDependencies: codefly resolved no ${api} endpoint address for dependency "${service}"${within} ` +
        `(codefly get endpoints ${service} --type ${api}). ` +
        `Declare that endpoint, set readyService to a service that has one, or pass baseURL.`,
    );
    this.name = "DependencyAddressUnresolvedError";
    this.service = service;
    this.api = api;
    this.scope = scope;
  }
}
