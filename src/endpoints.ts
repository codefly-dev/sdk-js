export interface Route {
    path: string;
    method: string;
    visibility: string;
}

export interface ServiceEndpoint {
    service: string;
    applicationName?: string;
    serviceName?: string;
    address: string;
    routes: Route[];
}

function parseEndpointsFromEnv() {
    const endpoints: { [key: string]: ServiceEndpoint } = {};

    Object.keys(process.env).forEach((key) => {
        // CODEFLY__ENDPOINT__BACKEND__API__NAME__REST
        const endpointMatch = key.match(/^CODEFLY__ENDPOINT__(.+)__(.+)__NAME__REST$/);

        if (endpointMatch) {
            const [, applicationName, serviceName] = endpointMatch;
            const addressKey = `${applicationName.toUpperCase()}_${serviceName.toUpperCase()}`;
            const service = `${applicationName}/${serviceName}`.toLowerCase();
            const rawAddress = process.env[key];
            if (rawAddress) {
                // Do base64 decoding
                const address = Buffer.from(rawAddress, 'base64').toString('utf-8');
                endpoints[addressKey] = { service: service, address, routes: [], applicationName, serviceName };
            } else {
                console.warn(`Environment variable ${key} is not set`);
            }
        }
    });

    return endpoints;
}

function parseRoutes(endpoints: { [key: string]: ServiceEndpoint }) {
    Object.keys(process.env).forEach((key) => {
        const routeMatch = key.match(/^CODEFLY__RESTROUTE__(.+)__(.+)__(.*)__REST___(.+)___(.*)$/);
        if (routeMatch) {
            const [, applicationName, serviceName, endpointName, rest, method] = routeMatch;
            const addressKey = `${applicationName.toUpperCase()}_${serviceName.toUpperCase()}`;

            // Ensure the endpoint exists before adding routes to it
            if (!endpoints[addressKey]) {
                console.warn(`ServiceEndpoint for ${applicationName}/${serviceName} not found when processing route: ${key}`);
                return;
            }

            // The method is the value of the environment variable
            const visibility = process.env[key]  ?? '';
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
            const [, applicationName, serviceName, endpointName] = endpointMatch;
            const addressKey = `${applicationName.toUpperCase()}_${serviceName.toUpperCase()}`;
            const service = `${applicationName}/${serviceName}`.toLowerCase();

            const rawAddress = process.env[key];
            if (rawAddress) {
                // Do base64 decoding
                const address = Buffer.from(rawAddress, 'base64').toString('utf-8');
                endpoints[addressKey] = {service: service, address, routes: [], applicationName, serviceName};
            } else {
                console.warn(`Environment variable ${key} is not set`);
            }
        }
    });
}

export function getEndpoints(): ServiceEndpoint[] {
    const endpoints = parseEndpointsFromEnv();
    parseRoutes(endpoints);
    return Object.values(endpoints);
}
