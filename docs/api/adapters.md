# Adapters

Adapters are used to serve the API. There are many adapters available, but all takes similar options, like `prefixUrl`, `router`, `ctx` (which is the initial context), `dataSerializers` and `bodyParsers`.

```ts
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'
import { db } from './db' 

const server = createHTTPServer({
    prefixUrl: '/api',
    router: rootRouter,
    ctx: {
        db,
    }
})
```

## Options

### prefixUrl  

Type: `string`


### bodyParsers

### dataSerializers

### deserializeParams

### deserializeSearchParams
