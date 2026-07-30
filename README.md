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

## Run tests

```shell
npx jest
```

## Publish

```shell
npm publish
```
