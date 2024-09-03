# Adapters

Adapters are used to serve the API. There are many adapters available, but all takes similar options, like `prefixUrl`, `router`, `ctx` (which is the initial context).

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

```ts
type BodyParserFunction = (options: {
    readonly body: Readable | null;
    readonly mediaType: string;
    readonly boundary?: string;
    readonly charset?: string;
} & BodyFunctions) => MaybePromise<any>;

type BodyParsers = Record<string, BodyParserFunction>
```

Key of `BodyParsers` is the `media-type/subtype` or `media-type/*` or `*/*`. `BodyFunctions` are `text()`, `arrayBuffer()`, `blob()`, `formData()`, `buffer()`, `stream()`, They could be different depending on the adapter.


### dataSerializers

```ts
type DataSerializerFunction = (options: {
    data: any;
    mediaType: string;
    charset?: string;
    boundary?: string;
}) => MaybePromise<Body>;

type DataSerializers = Record<string, DataSerializerFunction>
```

Key of `DataSerializers` is the `media-type/subtype` or `media-type/*` or `*/*`. `Body` could be `string`, `ArrayBuffer`, `FormData`, `URLSearchParams`. Different adapters support different body types.

### deserializeParams

```ts
type DeserializeParamsFunction = (
    params: Record<string, string>, schema: any
) => Record<string, any>
```

### deserializeSearchParams

```ts
type DeserializeSearchParamsFunction = (
    searchParams: Record<string, string[]>, schema: any
) => Record<string, any[]>
```