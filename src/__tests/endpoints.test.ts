import { ServiceEndpoint, getEndpoints } from '../endpoints';

describe('parseEnvVariables', () => {
    describe('when single addresse available for an endpoint ( string format )', () => {

        const originalEnv = process.env;
        var endpoints: ServiceEndpoint[];

        beforeAll(() => {
            process.env = {
                ...process.env,
                'CODEFLY__ENDPOINT__BACKEND__API__NAME__REST': 'aHR0cDovL2xvY2FsaG9zdDozMDAw',
                'CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__GREETER___GET': 'public',
                'CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__VERSION___POST': 'application',
            };

            endpoints = getEndpoints();
        })

        afterAll(() => {
            // Restore process.env after each test
            process.env = originalEnv;
        })

        it('should parse environment variables into endpoints and routes', () => {
            expect(endpoints.length).toBe(1);
            expect(endpoints[0].service).toBe('backend/api');
            expect(endpoints[0].addresses.length).toBe(1);
            expect(endpoints[0].addresses[0]).toBe('localhost:8080');
            expect(endpoints[0].routes.length).toBe(2);
            expect(endpoints[0].routes).toEqual([
                { path: '/backend/server/greeter', method: 'GET', visibility: 'public' },
                { path: '/backend/server/version', method: 'POST', visibility: 'application' }
            ]);
        });
    })

    describe('when multiple addresse available for an endpoint', () => {

        const originalEnv = process.env;
        var endpoints: ServiceEndpoint[];

        beforeAll(() => {
            process.env = {
                ...process.env,
                'CODEFLY__ENDPOINT__BACKEND__API__NAME__REST': 'aHR0cDovL2xvY2FsaG9zdDozMDAw',
                'CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__GREETER___GET': 'public',
                'CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__VERSION___POST': 'application',
            };

            endpoints = getEndpoints();
        })

        afterAll(() => {
            // Restore process.env after each test
            process.env = originalEnv;
        })

        it('should parse the endpoint', () => {
            expect(endpoints.length).toBe(1);
        });

        it('should parse the service', () => {
            expect(endpoints[0].service).toBe('backend/api');
        });

        it('should have correct addresses', () => {
            expect(endpoints[0].addresses.length).toBe(2);
            expect(endpoints[0].addresses[0]).toBe('localhost:25001');
        });

        it('should have correct routes', () => {
            expect(endpoints[0].routes.length).toBe(2);
            expect(endpoints[0].routes).toEqual([
                { path: '/backend/server/greeter', method: 'GET', visibility: 'public' },
                { path: '/backend/server/version', method: 'POST', visibility: 'application' }
            ]);
        })
    })

    describe('when a single addresse available for an endpoint ( JSON format )', () => {

        const originalEnv = process.env;
        var endpoints: ServiceEndpoint[];

        beforeAll(() => {
            process.env = {
                ...process.env,
                'CODEFLY_ENDPOINT__BACKEND__API___REST': '["localhost:25001"]',
                'CODEFLY_RESTROUTE__BACKEND__API___REST____BACKEND__SERVER__GREETER_____GET': 'public',
                'CODEFLY_RESTROUTE__BACKEND__API___REST____BACKEND__SERVER__VERSION_____POST': 'application',
            };

            endpoints = getEndpoints();
        })

        afterAll(() => {
            // Restore process.env after each test
            process.env = originalEnv;
        })

        it('should parse the endpoint', () => {
            expect(endpoints.length).toBe(1);
        });

        it('should parse the service', () => {
            expect(endpoints[0].service).toBe('backend/api');
        });

        it('should have correct addresses', () => {
            expect(endpoints[0].addresses.length).toBe(1);
            expect(endpoints[0].addresses[0]).toBe('localhost:25001');
        });

        it('should have correct routes', () => {
            expect(endpoints[0].routes.length).toBe(2);
            expect(endpoints[0].routes).toEqual([
                { path: '/backend/server/greeter', method: 'GET', visibility: 'public' },
                { path: '/backend/server/version', method: 'POST', visibility: 'application' }
            ]);
        })
    })
});

