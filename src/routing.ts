import { getEndpointUrl } from "./internal";

// Define a custom type for HTTP methods
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

// Define an array of HTTP method names
export const httpMethods: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];


// Define an empty object to hold the httpFunctions
export const routing: { [key in Method]: (service: string, path: string) => string | null } = {} as any;

routing.GET = (service: string, path: string) => getEndpointUrl("GET", service, path)
// Dynamically generate httpFunctions based on the httpMethods array
httpMethods.forEach(method => {
    routing[method] = (service: string, path: string) => getEndpointUrl(method, service, path)
});



