export interface Route {
    path: string;
    method: string;
    visibility: string;
}

export interface ServiceEndpoint {
    service: string;
    application: string;
    address: string;
    routes: Route[];
}

function parseEndpointsFromEnv() {
    const endpoints: { [key: string]: ServiceEndpoint } = {};

    Object.keys(process.env).forEach((key) => {
        // CODEFLY__ENDPOINT__BACKEND__API__REST__REST
        const endpointMatch = key.match(/^CODEFLY__ENDPOINT__(.+)__(.+)__REST__REST$/);

        if (endpointMatch) {
            const [, application_key, service_key] = endpointMatch;
            const addressKey = `${application_key.toUpperCase()}_${service_key.toUpperCase()}`;
            const service = service_key.toLowerCase();
            const application = application_key.toLowerCase();
            const address = process.env[key];

            endpoints[addressKey] = { service: service, address: address ?? '', routes: [], application };
        }
    });

    return endpoints;
}

function parseRoutes(endpoints: { [key: string]: ServiceEndpoint }) {
    Object.keys(process.env).forEach((key) => {
        const routeMatch = key.match(/^CODEFLY__REST_ROUTE__(.+)__(.+)__(.*)__REST___(.+)___(.*)$/);
        if (routeMatch) {
            const [, application, service_key, endpointName, rest, method] = routeMatch;
            const addressKey = `${application.toUpperCase()}_${service_key.toUpperCase()}`;

            // Ensure the endpoint exists before adding routes to it
            if (!endpoints[addressKey]) {
                console.warn(`ServiceEndpoint for ${application}/${service_key} not found when processing route: ${key}`);
                return;
            }

            // The method is the value of the environment variable
            const visibility = process.env[key] ?? '';
            if (visibility === '') {
                console.warn(`Visibility for route ${key} is not set`);
                return;
            }
            // Transform 'rest' into a path by replacing '__' with '/'
            const path = `/${rest.replace(/__/g, '/')}`.toLowerCase();

            if (method) {
                endpoints[addressKey].routes.push({ path, method, visibility });
            } else {
                console.warn(`No method specified for route ${key}`);
            }
        }
    });
}


export function getEndpointsMap() {
    const map = {};
    const endpoints: { [key: string]: ServiceEndpoint } = {};

    Object.keys(process.env).forEach((key) => {
        const endpointMatch = key.match(/^CODEFLY__ENDPOINT__(.+)__(.+)__(.*)__REST$/);

        if (endpointMatch) {
            const [, application, service_key, endpointName] = endpointMatch;
            const addressKey = `${application.toUpperCase()}_${service_key.toUpperCase()}`;
            const service = service_key.toLowerCase();

            const address = process.env[key];
            endpoints[addressKey] = { service: service, address: address ?? "", routes: [], application };
        }
    });
}

export function getEndpoints(): ServiceEndpoint[] {
    const endpoints = parseEndpointsFromEnv();
    parseRoutes(endpoints);
    return Object.values(endpoints);
}
