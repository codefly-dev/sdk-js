// Define a custom type for HTTP methods
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'

// Define an array of HTTP method names
export const httpMethods: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

export interface Route {
    method: Method;
    path: string;
}

export interface ServiceEndpoint {
    module: string;
    service: string;
    address: string;
    routes: Route[];
}

export interface ModuleEndpoints {
    module: string;
    services: ServiceEndpoint[];
}

export interface EndpointRequest {
    service?: string;
    path: string;
    method?: Method;
}
