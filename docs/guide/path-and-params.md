# Path and Params

## Path
Every route must define path. You do that with `route.path()`. 

```ts
import { route } from './route'

const getPostsRoute = route
    .path('/posts')
    .get()
    .use((req, res) => {
        // do something...
    }).build()
```

## Params

You can define params in route path by prefixing with `:`.

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

### Serialization

In client, you can pass pass, `number`, `string`, `boolean`, `date` as param value. All these values, are serialized to string. 

```ts
client.get(':/path/:number/:string/:boolean/:date', {
    params: {
        number: 123,
        string: 'abc',
        boolean: true,
        date: new Date(),
    }
}) // '/path/123/abc/true/2021-10-01T00:00:00.000Z'
```

You can define the custom serialization function for the param value, using [`serializeParams`](../api/dredge-fetch.md#serializeparams) option.

```ts
client = client.extends({
    serializeParams: (params) => {
        return {}
    }
})
```

### Deserialization

Params need to be deserialized to the correct type before giving to route, by default `deserializeParams` function uses information from params schema to deserialize the param value.  

You can pass your custom deserialization function using [`deserializeParams`](../api//adapters.md/#deserializeparams) in adapter options.

```ts
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'
import { db } from './db'
 
const server = createHTTPServer({
    router: rootRouter,
    ctx: {
        db,
    }

    deserializeParams: (params, schema) => {   
        return {
        }
    }
})

```