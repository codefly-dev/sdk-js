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
