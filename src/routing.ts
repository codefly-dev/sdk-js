import { ServiceEndpoint } from './endpoints';
import { getEndpointUrl } from './internal';
import { Method, httpMethods } from './types';
import { RouteNotFoundError } from './errors';
import { getCurrentModule } from './endpoints';

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
    module = getCurrentModule(),
    service,
    path,
    method = 'GET'
}: EndpointRequest): string => {
    const currentModule = getCurrentModule();
    const url = getEndpointUrl(method, currentModule, service, path);
    
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
