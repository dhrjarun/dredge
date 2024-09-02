# SearchParams

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

## Serialization

On client, you can pass `number`, `string`, `boolean`, `date` as value for `searchParams`, which gets serialized to string. If you wish to implement this behavior on your own, you can do with [`serializeSearchParams`](../api/dredge-fetch.md#serializesearchparams) option in client. 

```ts
client = client.extends({
    serializeSearchParams: (searchParams) => {
        return {}
    }
})
```

## Deserialization

On server, search string from url need to be transformed to the correct type before giving to route. By default, dredge uses information from search params schema to deserialize the search param value. 

You can pass your custom deserialization function using [`deserializeSearchParams`](../api/adapters.md#deserializesearchparams) in adapter options.

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

    deserializeSearchParams: (searchParams, schema) => {
        return {

        }
    }
})
```