import { ServiceEndpoint } from "./endpoints";
import { getEndpointUrl } from "./internal";
import { Method, httpMethods } from "./types";

// Define an empty object to hold the httpFunctions
export const routing: { [key in Method]: (module: string, service: string, path: string, endpoints?: ServiceEndpoint[]) => string | null } = {} as any;

// Dynamically generate httpFunctions based on the httpMethods
httpMethods.forEach(method => {
    routing[method] = (module: string, service: string, path: string, endpoints?: ServiceEndpoint[]) => getEndpointUrl(method, module, service, path, endpoints)
});
