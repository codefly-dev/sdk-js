import { getEndpoints } from "./endpoints";

const run = () => {
    console.log('running');
    const encodedURL = "aHR0cDovL2xvY2FsaG9zdDo4MDgw";


    process.env.CODEFLY_ENVIRONMENT="local"
    process.env.CODEFLY__ENDPOINT__BACKEND__SERVER__REST__REST="localhost:42042"
    process.env.CODEFLY__REST_ROUTE__BACKEND__SERVER__REST__REST___VISIT___POST="public"
    process.env.CODEFLY__REST_ROUTE__BACKEND__SERVER__REST__REST___VISIT__STATISTICS___GET="public"
    process.env.CODEFLY__REST_ROUTE__BACKEND__SERVER__REST__REST___VERSION___GET="public"


    // process.env = {
    //     ...process.env,
    //     'CODEFLY__ENDPOINT__BACKEND__API__REST__REST': encodedURL,
    //     'CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__GREETER___GET': 'public',
    //     'CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__VERSION___GET': 'public',
    //     'CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__VERSION___POST': 'application',
    // };

    const e = getEndpoints()


    // console.log('process.env.CODEFLY__ENDPOINT__BACKEND__API__REST__REST', process.env.CODEFLY__ENDPOINT__BACKEND__API__REST__REST)
    console.log('ee>>', e)
    console.log('ee routes>>', e[0].routes)


    // const key = 'CODEFLY__ENDPOINT__BACKEND__API__REST__REST';
    // const endpointMatch = key.match(/^CODEFLY__ENDPOINT__(.+)__(.+)__NAME__REST$/);

    // console.log('endpointMatch', endpointMatch)


    // Dynamically import codefly internal to ensure it uses the updated process.env
    const { getEndpointUrl } = require('./internal');
    const result = getEndpointUrl("GET", "backend/server", "/version");

    console.log('result', result);
}



run();




// with service name at the end
// CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__API__SERVER__VERSION___GET

// >>> GET backend/api/server/version


// without the service name at the end
// CODEFLY__RESTROUTE__BACKEND__API__NAME__REST___BACKEND__SERVER__VERSION___GET

// >>> GET backend/server/version