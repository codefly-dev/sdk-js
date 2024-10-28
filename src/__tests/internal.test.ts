const url = "http://localhost:8080";

import { getCurrentModule, getCurrentService, getCurrentServiceVersion } from "../endpoints";

describe('codefly getEndpointUrl', () => {
    // Save the original process.env
    const originalEnv = process.env;

    beforeEach(() => {
        // Clear Jest module cache and reset process.env before each test
        jest.resetModules(); // This ensures modules re-import their dependencies
        process.env = { ...originalEnv }; // Clone originalEnv to reset process.env
    });

    afterEach(() => {
        // Restore process.env after each test
        process.env = originalEnv;
    });

    it('should return the correct address for a given route', () => {
        // Mock environment variables
        process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
        process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___USERS__BACKEND__VERSION___GET = 'public';

        // Dynamically import codefly internal to ensure it uses the updated process.env
        const { getEndpointUrl } = require('../internal');

        const result = getEndpointUrl("GET", "public", "api", "/users/backend/version");
            
        expect(result).toEqual(`${url}/users/backend/version`);
    });

    it('should return null if the method is not available', () => {
        // Mock environment variables
        process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
        process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___USERS__BACKEND__VERSION___GET = 'public';

        // Dynamically import codefly internal to ensure it uses the updated process.env
        const { getEndpointUrl } = require('../internal');

        const result = getEndpointUrl("POST", "public", "api", "/users/backend/version");
            
        expect(result).toEqual(null);
    });


    it('should return null if the route is not available', () => {
        // Mock environment variables
        process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
        process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___BACKEND__SERVER__VERSION___GET = 'public';

        // Dynamically import codefly internal to ensure it uses the updated process.env
        const { getEndpointUrl } = require('../internal');

        const result = getEndpointUrl("GET", "users", "api", "/users/server/version");
            
        expect(result).toEqual(null);
    });

    it('should return null if the service is not available', () => {
        // Mock environment variables
        process.env.CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST = url;
        process.env.CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___BACKEND__SERVER__VERSION___GET = 'public';

        // Dynamically import codefly internal to ensure it uses the updated process.env
        const { getEndpointUrl } = require('../internal');

        const result = getEndpointUrl("GET", "api", "unavailable", "/na");
            
        expect(result).toEqual(null);
    });
});



describe('getCurrentModule', () => {
    beforeEach(() => {
        process.env = {};
    });

    it('should get module from CODEFLY__MODULE', () => {
        process.env.CODEFLY__MODULE = 'mymodule';
        expect(getCurrentModule()).toBe('mymodule');
    });

    it('should get module with prefix', () => {
        process.env.NEXT_PUBLIC_CODEFLY__MODULE = 'mymodule';
        expect(getCurrentModule()).toBe('mymodule');
    });

    it('should return empty string if no module env var', () => {
        expect(getCurrentModule()).toBe('');
    });
});

describe('getCurrentService', () => {
    beforeEach(() => {
        process.env = {};
    });

    it('should get service from CODEFLY__SERVICE', () => {
        process.env.CODEFLY__SERVICE = 'myservice';
        expect(getCurrentService()).toBe('myservice');
    });

    it('should get service with prefix', () => {
        process.env.NEXT_PUBLIC_CODEFLY__SERVICE = 'myservice';
        expect(getCurrentService()).toBe('myservice');
    });

    it('should return empty string if no service env var', () => {
        expect(getCurrentService()).toBe('');
    });
});

describe('getCurrentServiceVersion', () => {
    beforeEach(() => {
        process.env = {};
    });

    it('should get version from CODEFLY__SERVICE_VERSION', () => {
        process.env.CODEFLY__SERVICE_VERSION = 'v1';
        expect(getCurrentServiceVersion()).toBe('v1');
    });

    it('should get version with prefix', () => {
        process.env.NEXT_PUBLIC_CODEFLY__SERVICE_VERSION = 'v2';
        expect(getCurrentServiceVersion()).toBe('v2');
    });

    it('should return empty string if no version env var', () => {
        expect(getCurrentServiceVersion()).toBe('');
    });
});
