import { getEndpointUrl } from "./internal";
import { Method, httpMethods } from "./types";




// Define an empty object to hold the httpFunctions
export const routing: { [key in Method]: (service: string, path: string) => string | null } = {} as any;

// Dynamically generate httpFunctions based on the httpMethods
httpMethods.forEach(method => {
    routing[method] = (service: string, path: string) => getEndpointUrl(method, service, path)
});



