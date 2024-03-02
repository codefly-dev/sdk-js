
// Assuming `endpoints` is a global or accessible variable populated from environment variables:
import { ServiceEndpoint, getEndpoints } from "./endpoints";

export interface GetEnpointURLParams {
    service: string;
    method: string;
    path: string;
}

var endpoints: ServiceEndpoint[] = getEndpoints();

export function getEndpointUrl(method: string, service: string, path: string): string | null {

    // Find the matching endpoint
    const matchingEndpoint = endpoints.find(ep => ep.service === service);
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

    return getAddressFromServiceEndpoint(matchingEndpoint)

}

function getAddressFromServiceEndpoint(serviceEndpoint: ServiceEndpoint): string | null {
    // There could be multiple addresses for a service endpoint ATM. 
    // codefly should be able to send a single url for a service endpoint
    // right now we return the first address of the service endpoint.
    return serviceEndpoint.addresses[0] || null;
}
