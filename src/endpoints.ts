export interface Route {
    path: string;
    method: string;
    visibility: string;
}

export interface ServiceEndpoint {
    service: string;
    module: string;
    address: string;
    routes: Route[];
}

export interface ModuleEndpoints {
    name: string;
    services: ServiceEndpoint[];
}

function endpointKey(module: string, service: string, endpointName: string) {
    return `${module.toUpperCase()}_${service.toUpperCase()}_${endpointName.toUpperCase()}`;
}

function parseEndpointsFromEnv() {
    const endpoints: { [key: string]: ServiceEndpoint } = {};

    Object.keys(process.env).forEach((key) => {
        if (!key.startsWith("CODEFLY__ENDPOINT")) {
            return;
        }
        // CODEFLY__ENDPOINT__{MODULE}__{SERVICE}__{NAME}__{TYPE}
        const endpointMatch = key.match(/^CODEFLY__ENDPOINT__(.+)__(.+)__(.*)__REST$/);

        if (endpointMatch) {
            const [, module, service, endpointName] = endpointMatch;
            const addressKey = endpointKey(module, service, endpointName);
            const address = process.env[key];
            endpoints[addressKey] = { service: service.toLowerCase(), module: module.toLowerCase(), address: address ?? '', routes: [] };
        }
    });

    return endpoints;
}

function parseRoutes(endpoints: { [key: string]: ServiceEndpoint }) {
    Object.keys(process.env).forEach((key) => {
        if (!key.startsWith("CODEFLY__REST_ROUTE")) {
            return;
        }

        const routeMatch = key.match(/^CODEFLY__REST_ROUTE__(.+)__(.+)__(.*)__REST___(.+)___(.*)$/);
        if (routeMatch) {
            const [, module, service, endpointName, route, method] = routeMatch;
            const addressKey = endpointKey(module, service, endpointName);


            // Ensure the endpoint exists before adding routes to it
            if (!endpoints[addressKey]) {
                console.warn(`ServiceEndpoint for ${module}/${service} not found when processing route: ${key} ${addressKey} ${endpoints}`);
                return;
            }

            // The method is the value of the environment variable
            const visibility = process.env[key] ?? '';
            if (visibility === '') {
                console.warn(`Visibility for route ${key} is not set`);
                return;
            }
            // Transform 'rest' into a path by replacing '__' with '/'
            const path = `/${route.replace(/__/g, '/')}`.toLowerCase();

            if (method) {
                endpoints[addressKey].routes.push({ path, method, visibility });
            } else {
                console.warn(`No method specified for route ${key}`);
            }
        }
    });
}

export function getEndpoints(): ServiceEndpoint[] {
    const endpoints = parseEndpointsFromEnv();
    parseRoutes(endpoints);
    const serviceEndpoints = Object.values(endpoints);
    console.log("serviceEndpoints", serviceEndpoints)
    return serviceEndpoints;
}

export function getEndpointsByModule(): ModuleEndpoints[] {
    const map: { [key: string]: ModuleEndpoints } = {};
    const endpoints = getEndpoints();

    endpoints.forEach((endpoint) => {
        if (!map[endpoint.module]) {
            map[endpoint.module] = { name: endpoint.module, services: [] };
        }

        map[endpoint.module].services.push(endpoint);
    });

    return Object.values(map);
}
