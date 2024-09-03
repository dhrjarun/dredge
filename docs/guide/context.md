# Context

Context can store data, which you can access in the [middlewares](middleware.md) `res.ctx`. It is a great place to store stuff like database connection, user session, etc.

## Initial Context
When creating the route, you can define the initial context which are passed to the [route](route-and-router.md) by the adapter. Later on in the middleware, you can store new data or modify the existing data of the context.

```ts
// route.ts
import { dredgeRoute } from 'dredge-route';
import type { DB } from './db'

type InitialContext = {
    db: DB
}

export const route = dredgeRoute<InitialContext>(); 
```

Access the ctx by `res.ctx` in the middleware.

```ts
import { route } from './route'

route.use((req, res) => {
    const db = res.ctx.db // DB
}).error((err, req, res) => {
    const db = res.ctx.db // DB
})
```

Don't forget to pass the initial context when creating the server/adapter.

```ts
// server.ts
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'
import { db } from './db'

const server = createHTTPServer({
    router: rootRouter,
    ctx: {
        db,
    }
})

server.listen(3000)
```

## Adding new data to the context

You can update the context by using `res.next()`.

```ts
route.use((req, res) => {
    return res.next({
        ctx: {
            info: 'Hello World',
        }
    })
})
```