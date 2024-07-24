const url = "http://localhost:8080";


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
