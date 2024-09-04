# Quick Start

## Installation

Install these packages on server

::: code-group

```sh [npm]
npm install dredge-route dredge-adapters
```

```sh [yarn]
yarn add dredge-route dredge-adapters
```

```sh [pnpm]
pnpm add dredge-route dredge-adapters
```

:::


Install this on client

::: code-group

```sh [npm]
npm install dredge-fetch
```

```sh [yarn]
yarn add dredge-fetch
```

```sh [pnpm]
pnpm add dredge-fetch
```
:::

## Hello World

Let's create a simple `Get: /hello-world`  endpoint which return `Hello World` as response. 


### 1. Create The [route](route-and-router.md)
```ts
// route.ts
import { dredgeRoute } from 'dredge-route';

export const route = dredgeRoute();
```

```ts
// hw-route.ts
import { route } from './route'

export const hwRoute = route
    .path('/hello-world')
    .get()
    .use((req, res) => {
        return res.end({
            data: 'Hello World',
            headers: {
                'Content-Type': 'text/plain'
            }
        })
    })
```

### 2. Create [router](route-and-router.md#router)  

```ts
// root-router.ts
import { dredgeRouter } from 'dredge-route';
import { hwRoute } from './hw-route'

export const rootRouter = dredgeRouter([hwRoute]);
export type RootRouter = typeof rootRouter;
```

### 3. Serve the API with an [Adapter](adapters.md)  

Pass the created router to the adapter.

```ts
// server.ts
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'

const server = createHTTPServer({
    router: rootRouter,
})

server.listen(3000)
```


### 4. Create client

Import the `RootRouter` type and build the client with it, Make sure to pass the correct prefixUrl.
```ts
// client.ts
import { dredgeFetch } from 'dredge-fetch'
import type { RootRouter } from './root-router'

const client = dredgeFetch<RootRouter>().extends({
    prefixUrl: 'http://localhost:3000',
})

const data = await client.get('/hello-world').data() // Hello World 
```