
// Assuming `endpoints` is a global or accessible variable populated from environment variables:
import {Endpoint, parseEnvVariables} from "./endpoints";


export interface CodeFlyRequest {
    service: string;
    method: string;
    path: string;
}

const endpoints: Endpoint[] = parseEnvVariables();

export function codefly({ service, method, path }: CodeFlyRequest): string[] | string | null {
    const [appName, serviceName] = service.split('/');

    // Find the matching endpoint
    const matchingEndpoint = endpoints.find(ep => ep.service === service);
    if (!matchingEndpoint) {
        console.warn(`Endpoint ${service} not found.`);
        return null;
    }

    // Find the matching route
    const matchingRoute = matchingEndpoint.routes.find(route => route.path === path && route.method.toLowerCase() === method.toLowerCase());
    if (!matchingRoute) {
        console.warn(`Route ${path} with method ${method} not found in endpoint ${service}.`);
        return null;
    }

    // Return the addresses associated with the matching endpoint
    return matchingEndpoint.addresses.length > 1 ? matchingEndpoint.addresses : matchingEndpoint.addresses[0] || null;
}