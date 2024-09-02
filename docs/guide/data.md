## Data

Instead of request/response body, you deal with data in Dredge. You will pass data to client which will be serialized to generate body. Client response has method `data()` which parses the body and returns. 

In route middleware, you receive request data(parsed body) instead of request body. You pass response data to `res.end()` which will be serialized and sent with HTTP response by adapter.


## Send and Receive Text
```ts
import { route } from './route'
import z from 'zod'

export const textRoute = route
    .path('/text')
    .post(z.string())
    .use((req, res) => {
        const posts = await req.ctx.db.getPosts();
        const text = req.data; // string

        return res.end({
            data: text,
            headers: {
                'Content-Type': 'text/plain'
            }
        })
    })
```

```ts
import { client } from './client'

const data = await client.get('/hello-world').data() // Hello World
```

## Send and Receive JSON

```ts
import { route } from './route'
import z from 'zod'

const createPostRoute = route
    .path('/json')
    .post(
        z.object().passthrough()
    )
    .use(async (req, res) => {
        const json = req.data; // object

        return res.end({
            data: {
                ...json,
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


const response = await client.post('/json', {
    data: {
        a: 'apple',
        b: 'banana',
    },
    headers: {
        'content-type': 'application/json'
    }
})

const { a, b } = await response.data()
```


## DataTypes
Isn't is uncool to specify `content-type` header manually on every request and response? Dredge has something for this. Define the dataTypes and see the magic.


### DataTypes in Route
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

Now let's define `Post /text` route again. 
```ts
import { route } from './route'
import z from 'zod'

let textRoute = route.path('/text').post(z.string()).use((req, res) => {
    const data = req.data; // string

    return res.end({
        text: data, // sets content-type header to 'text/plain'
        // we are not using data field, and neither setting the content-type header, it will be done automatically.
    })
})

// same as above 
textRoute = route.path('/text').post(z.string()).use((req, res) => {
    const data = req.data; // string

    return res.end({
        data: data, 
        dataType: 'text'
    })
})
```

### DataTypes in Client
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

Call the `POST /json` route again.
```ts
import { client } from './client'

let data = await client.post('/posts', {
    // no need to set content-type header
    json: {
        title: 'My first post',
        content: 'This is my first post..',
    },
}).data()

// same as above
data = await client.post('/posts', {
    data: {
        title: 'My first post',
        content: 'This is my first post..',
    },
    dataType: 'json'
})
```

Not just `content-type` header, you can also set `accept` header. For that you can either use the `responseDataType` options or call the dataType corresponding method on response.

```ts
import { client } from './client'

let data = await client.post('/posts', {
    json: {
        title: 'My first post',
        content: 'This is my first post..',
    },
    responseDataType: 'json' // sets accept header to 'application/json'
}).data()

// same as above
data = await client.post('/posts', {
    json: {
        title: 'My first post',
        content: 'This is my first post..',
    },
}).json() // sets accept header to 'application/json'
```


## Stringify

Data are stringified according to `content-type` to generate body. By default, dredge provide support for the `text/plain` and `application/json` data. For route data, you can define your custom stringifier in the adapter's `dataSerializers` option.

```ts
// server.ts
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'
import { db } from './db'

const server = createHTTPServer({
    prefixUrl: '/api',
    router: rootRouter,
    ctx: {
        db,
    },
    dataSerializers: {
        // handle specific content-type
        'application/yaml': ({ data, mediaType, boundary, charset }) => {
          
          
          return body;
        },

        // handle all image types
        'image/*': (options) => {}

        // handle rest of all types
        '*': (options) => {}
    }
})
```

## Parse

Body as well parsed according to `content-type` to create data. 
