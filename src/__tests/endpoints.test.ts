import { ServiceEndpoint, getEndpoints } from '../endpoints';

const url = "http://localhost:8080";
const encodedURL = "aHR0cDovL2xvY2FsaG9zdDo4MDgw";


describe('parseEnvVariables', () => {
    describe('when single address available for an endpoint ( string format )', () => {

        const originalEnv = process.env;
        var endpoints: ServiceEndpoint[];

        beforeAll(() => {
            process.env = {
                ...process.env,
                'CODEFLY__ENDPOINT__BACKEND__API__NAME__REST': encodedURL,
                'CODEFLY__REST_ROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__GREETER___GET': 'public',
                'CODEFLY__REST_ROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__VERSION___POST': 'application',
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
            expect(endpoints[0].address).toBe('http://localhost:8080');
            expect(endpoints[0].routes.length).toBe(2);
            expect(endpoints[0].routes).toEqual([
                { path: '/backend/server/greeter', method: 'GET', visibility: 'public' },
                { path: '/backend/server/version', method: 'POST', visibility: 'application' }
            ]);
        });
    })
});

