import { ServiceEndpoint } from './parsing';
import { Method, httpMethods } from './types';
import { RouteNotFoundError } from './errors';
import { getCurrentModule, getEndpoints } from './parsing';


// Define an empty object to hold the httpFunctions
export const routing: { [key in Method]: (module: string, service: string, path: string, endpoints?: ServiceEndpoint[]) => string | null } = {} as any;

// Dynamically generate httpFunctions based on the httpMethods
httpMethods.forEach(method => {
    routing[method] = (module: string, service: string, path: string, endpoints?: ServiceEndpoint[]) => getEndpointUrl(method, module, service, path, endpoints)
});


interface EndpointRequest {
    module?: string;
    service: string;
    path: string;
    method?: Method;
}

export const endpoint = ({
    module,
    service,
    path,
    method = 'GET'
}: EndpointRequest): string => {
    if (!module) {
        module = getCurrentModule();
    }
    const url = getEndpointUrl(method, module, service, path);
    
    if (!url) {
        throw new RouteNotFoundError(method, path);
    }

    return url;
};

interface EndpointOptions {
    module?: string;
    service: string;
    path: string;
    method?: 'GET' | 'POST';
    params?: Record<string, string>;
    headers?: Record<string, string>;
    body?: any;
}


export async function fetchEndpoint<T = any>(options: EndpointOptions): Promise<T> {
    const url = endpoint(options);
    
    const response = await fetch(url, {
        method: options.method,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...(options.body && { body: JSON.stringify(options.body) }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

const _endpoints: ServiceEndpoint[] = getEndpoints();

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
