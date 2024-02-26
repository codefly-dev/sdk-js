import { parseEnvVariables } from './endpoints';

describe('parseEnvVariables', () => {
    it('should parse environment variables into endpoints and routes', () => {
        process.env = {
            ...process.env,
            'CODEFLY_ENDPOINT__PUBLIC__API___REST': 'localhost:24282',
            'CODEFLY_RESTROUTE__PUBLIC__API___REST____BACKEND__SERVER__GREETER_____GET': 'public',
            'CODEFLY_RESTROUTE__PUBLIC__API___REST____BACKEND__SERVER__VERSION_____POST': 'application',
        };

        const endpoints = parseEnvVariables();
        expect(endpoints.length).toBe(1);
        expect(endpoints[0].service).toBe('public/api');
        expect(endpoints[0].addresses[0]).toBe('localhost:24282');
        expect(endpoints[0].routes.length).toBe(2);
        expect(endpoints[0].routes).toEqual([
            { path: '/backend/server/greeter', method: 'GET', visibility: 'public' },
            { path: '/backend/server/version', method: 'POST', visibility: 'application' }
        ]);
    });
});