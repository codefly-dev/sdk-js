import { ServiceEndpoint,ModuleEndpoints, getEndpoints, getEndpointsByModule } from '../endpoints';

const urlPublicAPi = "http://public-api:8080";
const urlUserBackend = "http://user-backend:8080";
const urlUsersOther = "http://users-other:8080";


describe('parseEnvVariables', () => {
    describe('when single address available for an endpoint ( string format )', () => {

        const originalEnv = process.env;

        let endpoints: ServiceEndpoint[];
        let moduleEndpoints: ModuleEndpoints[];
        beforeAll(() => {
            process.env = {
                ...process.env,
                'CODEFLY__ENDPOINT__PUBLIC__API__NAME__REST': urlPublicAPi,
                'CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___BACKEND__SERVER__GREETER___GET': 'public',
                'CODEFLY__REST_ROUTE__PUBLIC__API__NAME__REST___BACKEND__SERVER__VERSION___POST': 'public',
                'CODEFLY__ENDPOINT__USERS__BACKEND__NAME__REST': urlUserBackend,
                'CODEFLY__REST_ROUTE__USERS__BACKEND__NAME__REST___SELF___GET': 'public',
                'CODEFLY__ENDPOINT__USERS__OTHER__NAME__REST': urlUsersOther,
                'CODEFLY__REST_ROUTE__USERS__OTHER__NAME__REST___ROUTE___GET': 'public',
            };

            endpoints = getEndpoints();
            moduleEndpoints = getEndpointsByModule();
        })

        afterAll(() => {
            // Restore process.env after each test
            process.env = originalEnv;
        })

        it('should parse environment variables into endpoints and routes', () => {
            expect(moduleEndpoints.length).toBe(2);
            // Find the module with the name 'public'
            const publicModule = moduleEndpoints.find(module => module.name === 'public');
            expect(publicModule).toBeDefined();
            expect(publicModule?.services.length).toBe(1);

            // Find the service with the name 'api'
            const publicApiService = publicModule?.services.find(service => service.service === 'api');
            expect(publicApiService).toBeDefined();
            expect(publicApiService?.routes.length).toBe(2);

            // Users module
            const usersModule = moduleEndpoints.find(module => module.name === 'users');
            expect(usersModule).toBeDefined();
            expect(usersModule?.services.length).toBe(2);

            // Find the service with the name 'backend'
            const usersBackendService = usersModule?.services.find(service => service.service === 'backend');
            expect(usersBackendService).toBeDefined();
            expect(usersBackendService?.routes.length).toBe(1);
        });
    })
});
