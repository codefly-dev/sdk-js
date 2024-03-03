import { routing } from '../routing';

import * as codefly from '../internal';
import { Method } from '../types';

describe('routing', () => {
    const httpMethods: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
    
    it("should have all HTTP methods", () => {
        // Check if each HTTP method is defined in httpFunctions
        httpMethods.forEach(method => {
            expect(typeof routing[method]).toBe("function");
        });
    });


    it("should call getEndpointUrl with correct params", () => {      
        // Call each function with a path and check if common function is called
        httpMethods.forEach(method => {
            const spy = jest.spyOn(codefly, "getEndpointUrl");
            
            routing[method]("test-service", "/route/to");
            expect(spy).toHaveBeenCalledWith(method, "test-service", "/route/to", undefined);

            spy.mockRestore();
        });
    });

    it("should call getEndpointUrl with correct params with endpoints", () => {      
        // Call each function with a path and check if common function is called
        httpMethods.forEach(method => {
            const spy = jest.spyOn(codefly, "getEndpointUrl");

            const endpoints = [
                {
                    service: 'counter-go-grpc-nextjs-postgres/api',
                    addresses: [],
                    routes: [],
                    applicationName: 'COUNTER-GO-GRPC-NEXTJS-POSTGRES',
                    serviceName: 'API'
                  }
            ]
            
            routing[method]("test-service", "/route/to", endpoints);
            expect(spy).toHaveBeenCalledWith(method, "test-service", "/route/to", endpoints);

            spy.mockRestore();
        });
    });
});

