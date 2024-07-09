
// Assuming `endpoints` is a global or accessible variable populated from environment variables:
import { ServiceEndpoint, getEndpoints } from "./endpoints";
import { Method } from "./types";

var _endpoints: ServiceEndpoint[] = getEndpoints();

export function getEndpointUrl(method: Method, module: string, service: string, path: string, serviceEndpoints?: ServiceEndpoint[]): string | null {

    const endpoints = serviceEndpoints ? serviceEndpoints : _endpoints;
    // Find the matching endpoint
    const matchingEndpoint = endpoints.find(ep => ep.service === service && ep.module === module);
    if (!matchingEndpoint) {
        console.warn(`ServiceEndpoint ${service} not found.`);
        return null;
    }

    // Find the matching route
    const matchingRoute = matchingEndpoint.routes.find(route => route.path === path && route.method.toLowerCase() === method.toLowerCase());
    if (!matchingRoute) {
        console.warn(`Route ${path} with method ${method} not found in endpoint ${service}.`);
        return null;
    }

    return getAddressFromServiceEndpoint(matchingEndpoint, path)

}

function getAddressFromServiceEndpoint(serviceEndpoint: ServiceEndpoint, path: string): string | null {
    // codefly should be able to send a single url for a service endpoint
    return serviceEndpoint.address ? `${serviceEndpoint.address}${path}` : null;
}
