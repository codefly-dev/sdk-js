describe('codefly getServiceUrl', () => {
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
        process.env.CODEFLY_ENDPOINT__BACKEND__API___REST = 'http://localhost:3000';
        process.env.CODEFLY_RESTROUTE__BACKEND__API___REST____BACKEND__SERVER__VERSION_____GET = 'public';

        // Dynamically import codefly to ensure it uses the updated process.env
        const { getServiceUrl } = require('../codefly');

        const result = getServiceUrl({
            service: "backend/api"
        });

        expect(result).toEqual('http://localhost:3000');
    });

    it('should return null if the service is not found', () => {
        // Dynamically import codefly to ensure it uses the updated process.env
        const { getServiceUrl } = require('../codefly');

        const result = getServiceUrl({
            service: "backend/api"
        });

        expect(result).toEqual(null);
    });
});