# Quick Start

## Installation

Install these packages on server
```sh
npm install dredge-route dredge-adapters
```

Install this on client
```sh
npm install dredge-fetch
```

## Hello world

Let's create a simple `Get: /hello-world`  endpoint which return `Hello World` as response. 

```ts
// route.ts
import { dredgeRoute } from 'dredge-route';

export const route = dredgeRoute();

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

Build the router which is the collection of all the routes.
```ts
// root-router.ts
import { dredgeRouter } from 'dredge-route';
import { hwRoute } from './route'

export const rootRouter = dredgeRouter([hwRoute]);
export type RootRouter = typeof rootRouter;
```

Serve the api
```ts
// server.ts
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'

const server = createHTTPServer({
    router: rootRouter,
})

server.listen(3000)
```

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

## Context in the middleware

Before going further, route need to access the db. It can be done with `context`. Define the `InitialContext` type and create route with it.

```ts   
// route.ts
import { dredgeRoute } from 'dredge-route';
import type { DB } from './db'

type InitialContext = {
    db: DB
}

export const route = dredgeRoute<InitialContext>(); 
```

Now you can access the db in `res.ctx`.

```ts
import { route } from './route'

route.use((req, res) => {
    const db = res.ctx.db // DB
})
```

You need to pass the initial context when creating the server/adapter.

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


## Send and Receive JSON

To demonstrate this, let's build a `POST /posts` route which will receive a json body, and send back a json response. 

We will validate the body with zod.

```ts
import { route } from './route'
import z from 'zod'

const createPostRoute = route
    .path('/posts')
    .post(
        z.object({
            title: z.string(),
            content: z.string(),
        })
    )
    .use(async (req, res) => {
        const data = req.data; // body is parsed and validated and returned as data 

        const post = await req.ctx.db.createPost(data);

        return res.end({
            // data will be serialized according to content-type and sent as response body
            data: { 
                id: post.id,
            }
            headers: {
                'Content-Type': 'application/json'
            }
        })
    })
```

Call the route.

```ts
import { client } from './client'


const response = await client.post('/posts', {
    // data will be serialized according to content-type and sent as request body
    data: {
        title: 'My first post',
        content: 'This is my first post..',
    },
    headers: {
        'content-type': 'application/json'
    }
})

const { id } = await response.data() // data() returns the parsed body 
```

## DataTypes
Are you tired of setting `content-type` header manually on every request and response? I have something for you. define the dataTypes and see the magic.

```ts
// route.ts
import { dredgeRoute } from 'dredge-route';
import type { DB } from './db'

type InitialContext = {
    db: DB
}

export const route = dredgeRoute<InitialContext>()
    .options({
        dataTypes: {
            json: 'application/json', // media-type
            text: 'text/plain',
        }
    })
```

Now let's define `Get /hello-world` route again.
```ts
import { route } from './route'

const hwRoute = route.path('/hello-world').get().use((req, res) => {
    return res.end({
        text: 'Hello World', // we are not using data field, and neither setting the content-type header, it will be done automatically.
    })
})
```

You can define the dataTypes in the client as well.
```ts
// client.ts
import { dredgeFetch } from 'dredge-fetch'
import type { RootRouter } from './root-router'

export const client = dredgeFetch<RootRouter>().extends({
    prefixUrl: 'http://localhost:3000',
    dataTypes: {
        json: 'application/json',
        text: 'text/plain',
    }
})
```

Call the `POST /posts` route again.
```ts
import { client } from './client'

const data = await client.post('/posts', {
    // no need to set content-type header
    json: {
        title: 'My first post',
        content: 'This is my first post..',
    },
}).data() 
```


## Using Params

You can define params in route path by prefixing with `:`. Not just that you can validate params as well.

```ts
import { route } from './route'
import z from 'zod'

const getPostBYIdRoute = route
    .path('/posts/:id')
    .params({
        id: z.string().uuid()
    })
    .get()
    .use(async (req, res) => {
        const id = req.param('id')

        const post = await req.ctx.db.getPostById(id);

        return res.end({
            json: post,
        })
    })
```

In the client there are two ways to send params. If you wish to send params separately, you have to prefix the path with `:/`.

```ts
import { client } from './client'

// with path
client.get('/posts/123');

// separately
client.get(':/posts/:id', {
    params: {
        id: '123'
    }
})
```

## Using SearchParams

```ts
import { route } from './route'

const getPostsRoute = route
    .path('/posts')
    .searchParams({
        page: z.number().min(1).max(100),
        limit: z.number().min(1).max(100),

        tags: z.array(z.string())
    })
    .get()
    .use((req, res) => {
        // get only one searchParam
        const page = req.searchParam('page'); // number
        const limit = req.searchParam('limit'); // number

        // get all searchParams
        const tags = req.searchParams('tags'); // string[]

        const posts = await req.ctx.db.getPosts({
            page,
            limit,
            tags,
        })
        return res.end({
            json: posts,
        })
    })
```

Call the route. You can't pass search param in path. You have to pass it in `searchParams` option. To pass multiple search params, use array.

```ts
import { client } from './client'

const posts = await client.get('/posts', {
    // '?page=1&limit=10&tags=tag1&tags=tag2'
    searchParams: {
        page: 1,
        limit: 10,
        tags: ['tag1', 'tag2'],
    }
}).data()
```




