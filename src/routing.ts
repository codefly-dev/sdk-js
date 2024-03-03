import { ServiceEndpoint } from "./endpoints";
import { getEndpointUrl } from "./internal";
import { Method, httpMethods } from "./types";

// Define an empty object to hold the httpFunctions
export const routing: { [key in Method]: (service: string, path: string, endpoints?: ServiceEndpoint[]) => string | null } = {} as any;

// Dynamically generate httpFunctions based on the httpMethods
httpMethods.forEach(method => {
    routing[method] = (service: string, path: string, endpoints?: ServiceEndpoint[]) => getEndpointUrl(method, service, path, endpoints)
});

routing.GET = (service: string, path: string, endpoints?: ServiceEndpoint[]) => {
    return "saman kumara"
}
