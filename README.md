# codefly JavaScript/TypeScript SDK

Product code discovers runtime wiring through the SDK rather than reading
Codefly's injected environment representation:

```ts
import { getEndpoints, getWorkspaceSecret } from "codefly";

const endpoints = getEndpoints();
const internalToken = getWorkspaceSecret(
  "internal-auth",
  "CODEFLY_INTERNAL_TOKEN",
);
```

Use `isLocal()` in server code to check whether Codefly selected its local
environment. A missing environment or a browser-facing copy of the environment
name yields `false`.

## Run tests

Run `./scripts/verify` with mise and Ruby installed to exercise every Node version in the CI matrix. Each entry installs from the lockfile, builds the SDK and runs Jest.

```shell
npx jest
```

## Publish

```shell
npm publish
```
