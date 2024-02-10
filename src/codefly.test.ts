import { parseEnvVariables } from './endpoints';


// Your test file
describe('codefly', () => {
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
        process.env.CODEFLY_ENDPOINT__PUBLIC__API___REST = 'http://localhost:3000';
        process.env.CODEFLY_RESTROUTE__PUBLIC__API___REST____BACKEND__SERVER__VERSION = 'GET';

        // Dynamically import codefly to ensure it uses the updated process.env
        const { codefly } = require('./codefly');

        const result = codefly({
            service: "public/api",
            method: "GET",
            path: "/backend/server/version"
        });

        expect(result).toEqual('http://localhost:3000');
    });
});