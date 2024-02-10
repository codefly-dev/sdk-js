export interface Route {
    path: string;
    method: string;
}

export interface Endpoint {
    service: string;
    addresses: string[];
    routes: Route[];
}

function parseEndpoints() {
    const endpoints: { [key: string]: Endpoint } = {};

    Object.keys(process.env).forEach((key) => {
        const endpointMatch = key.match(/^CODEFLY_ENDPOINT__(.+)__(.+)___REST$/);
        if (endpointMatch) {
            const [, appName, serviceName] = endpointMatch;
            const addressKey = `${appName.toUpperCase()}_${serviceName.toUpperCase()}`;
            const service = `${appName}/${serviceName}`.toLowerCase();

            // Initialize addresses as an array of strings
            let addresses: string[] = [];

            // Attempt to parse the environment variable value as JSON if it's a string that looks like a JSON array
            const rawAddresses = process.env[key];
            if (rawAddresses && rawAddresses.startsWith('[') && rawAddresses.endsWith(']')) {
                try {
                    const parsedAddresses = JSON.parse(rawAddresses);
                    // Ensure parsedAddresses is actually an array of strings
                    if (Array.isArray(parsedAddresses) && parsedAddresses.every(addr => typeof addr === 'string')) {
                        addresses = parsedAddresses;
                    } else {
                        console.warn(`Parsed addresses for ${key} are not a string array.`);
                    }
                } catch (e) {
                    console.error(`Error parsing JSON for ${key}:`, e);
                }
            } else if (rawAddresses) {
                // If it's a simple string (not JSON), just use it directly
                addresses = [rawAddresses];
            }

            endpoints[addressKey] = { service: service, addresses, routes: [] };
        }
    });

    return endpoints;
}

function parseRoutes(endpoints: { [key: string]: Endpoint }) {
    Object.keys(process.env).forEach((key) => {
        const routeMatch = key.match(/^CODEFLY_RESTROUTE__(.+)__(.+)___REST____(.+)$/);
        if (routeMatch) {
            const [, appName, serviceName, rest] = routeMatch;
            const addressKey = `${appName.toUpperCase()}_${serviceName.toUpperCase()}`;

            // Ensure the endpoint exists before adding routes to it
            if (!endpoints[addressKey]) {
                console.warn(`Endpoint for ${appName}/${serviceName} not found when processing route: ${key}`);
                return;
            }

            // The method is the value of the environment variable
            const method = process.env[key];
            // Transform 'rest' into a path by replacing '__' with '/'
            const path = `/${rest.replace(/__/g, '/')}`.toLowerCase();

            if (method) {
                endpoints[addressKey].routes.push({ path, method });
            } else {
                console.warn(`No method specified for route ${key}`);
            }
        }
    });
}


export function parseEnvVariables(): Endpoint[] {
    const endpoints = parseEndpoints();
    parseRoutes(endpoints);
    return Object.values(endpoints);
}
