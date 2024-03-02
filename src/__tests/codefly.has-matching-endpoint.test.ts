describe('codefly hasMatchingEndpoint', () => {
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

    it('should return true if a maching endpoint is found', () => {
        // Mock environment variables
        process.env.CODEFLY_ENDPOINT__BACKEND__API___REST = 'http://localhost:3000';
        process.env.CODEFLY_RESTROUTE__BACKEND__API___REST____BACKEND__SERVER__VERSION_____GET = 'public';

        // Dynamically import codefly to ensure it uses the updated process.env
        const { hasMatchingEndpoint } = require('../codefly');

        const result = hasMatchingEndpoint({
            service: "backend/api",
            method: "GET",
            path: "/backend/server/version"
        });

        expect(result).toEqual(true);
    });

    it('should return false if a maching method is not found', () => {
        // Mock environment variables
        process.env.CODEFLY_ENDPOINT__BACKEND__API___REST = 'http://localhost:3000';
        process.env.CODEFLY_RESTROUTE__BACKEND__API___REST____BACKEND__SERVER__VERSION_____GET = 'public';

        // Dynamically import codefly to ensure it uses the updated process.env
        const { hasMatchingEndpoint } = require('../codefly');

        const result = hasMatchingEndpoint({
            service: "backend/api",
            method: "POST",
            path: "/backend/server/version"
        });

        expect(result).toEqual(false);
    });

    it('should return false if a maching path is not found', () => {
        // Mock environment variables
        process.env.CODEFLY_ENDPOINT__BACKEND__API___REST = 'http://localhost:3000';
        process.env.CODEFLY_RESTROUTE__BACKEND__API___REST____BACKEND__SERVER__VERSION_____GET = 'public';

        // Dynamically import codefly to ensure it uses the updated process.env
        const { hasMatchingEndpoint } = require('../codefly');

        const result = hasMatchingEndpoint({
            service: "backend/api",
            method: "POST",
            path: "/backend/server/invalid-path"
        });

        expect(result).toEqual(false);
    });

    it('should return false if a maching endpoint is not found', () => {
        // Dynamically import codefly to ensure it uses the updated process.env
        const { hasMatchingEndpoint } = require('../codefly');

        const result = hasMatchingEndpoint({
            service: "backend/api"
        });

        expect(result).toEqual(false);
    });
});