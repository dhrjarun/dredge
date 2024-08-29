# dredgeFetch

```ts
import { dredgeFetch } from 'dredge-fetch'
import type { RootRouter } from './router' 

let client = dredgeFetch<RootRouter>().extends({
    prefixUrl: 'https://api.example.com'
})
```

## client(path, options)

Returns: [`DredgeResponsePromise`](#dredgeresponsepromise)\
Methods:
- `client.get(path, options)`
- `client.post(path, options)`
- `client.put(path, options)`
- `client.patch(path, options)`
- `client.delete(path, options)`
- `client.head(path, options)`
- `client.extends(defaultOptions)`

### path

Type: `string`

It should be only the pathname, it must not contain search query. If you wish to pass [params](#params) separately, then prefix the path with `:/`. 

```ts
client('/user/1', { method: 'get' });
client(':/user/:id', {
    method: 'get',
    params: {
        id: 1
    }
}); // same as above
```

### options

Type: `object`


#### prefixUrl

Type: `string` | `URL`

A prefix to prepend to the path of every request. It must be a valid url, otherwise an error will be thrown. 

Tip: Define it in [client.extends()](#clientextendsdefaultoptions).

#### dataTypes

Type: `Record<string, string>`\
Default: `{}`

Specify the dataType name as key and the media-type as value. This will let you use [dataType](#datatype) and [responseDataType](#responsedatatype).

Tip: Define it in [client.extends()](#clientextendsdefaultoptions).

#### dataType

Specify the content-type header with ease.

```ts
client = client.extends({
  dataTypes: {
        json: 'application/json',
        form: 'multipart/form-data'
    },
})


client('/posts', {
    method: 'post',
    headers: {
        'Content-Type': 'application/json'
    }
})
// same as above
client('/posts', {
    method: 'post',
    dataType: 'json'
})
```

#### data

Type: `any`

Instead of body, you pass data which will be [stringified](#dataserializers) according to content-type header and sent as body.

```ts
client = client.extends({
  dataTypes: {
        json: 'application/json',
        form: 'multipart/form-data'
    },
})

client('/users', {
    method: 'post',
    data: {
        name: 'Dhiraj Arun',
        username: 'dhrjarun'
    }
    dataType: 'json' // will be sent as 'Content-Type: application/json'
})
```

You can avoid passing `dataType` option and achieve the same like this:
```ts
client('/users', {
    method: 'post',
    json: {
        name: 'Dhiraj Arun',
        username: 'dhrjarun',
    }
})
```

Along with `data` option, there will be options like `json`, `form` or whatever you defined in [dataTypes](#datatype).

#### responseDataType

Specify the accept header with ease.

```ts
client = client.extends({
  dataTypes: {
        json: 'application/json',
        form: 'multipart/form-data'
    },
})


client('/post', {
    method: 'get', 
    headers: {
        'Accept': 'application/json'
    }
})
// same as above
client('/posts', {
    method: 'get',
    responseDataType: 'json' 
})
```

#### throwHttpErrors

Type: `boolean`\
Default: `true`

Throw  `HTTPError` for non 2xx responses.

#### searchParams

Type: `Record<string, any | any[]>`\
Default: `{}`

Send search params, in the value you can pass an array if you wish to send multiple queries. 

```ts
client('/posts', {
    method: 'get',
    searchParams: {
        page: 1, 
        tags: ['a', 'b']
    } // will be sent as '?page=1&tags=a&tags=b'
})
```

You can pass `string`, `number`, `boolean` even `Date` as value. It gets serialized according to [serializeSearchParams](#serializesearchparams).

#### params

Type: `Record<string, any>`\
Default: `{}`

Pass params separately from the path. Be sure to prefix the path with `:/`. You can pass `string`, `number`, `boolean` even `Date` as value and it will get serialized according to [serializeParams](#serializeparams).

```ts
client('/user/:id', {
    params: {
        id: 1
    }
})
```

#### headers

Type: `HeaderInit`\
Default: `{}`

Headers to be sent with the request.

#### method

Type: `string`

HTTP method used to make the request.

#### dataSerializers

Type: `Record<string, DataSerializer>`\
Default: `{ 'application/json': Function , 'text/plain': Function }`  

```ts
type DataSerializer = (
  options: DataSerializerOptions,
) => MaybePromise<string | ArrayBuffer | FormData | URLSearchParams>

type DataSerializerOptions = { 
    data: any,
    mediaType?: string,
    boundary?: string, 
    charset?: string 
}
```

Specify the serializers for media-types.

```ts
client = client.extends({
  dataSerializers: {
    'application/json': () => {},
    'multipart/form-data': () => {},
  }
})
```

#### bodyParsers

Type: `Record<string, BodyParser>`\
Default: `{ 'application/json': Function , 'text/plain': Function }`

```ts
type BodyParser = (
  options: BodyParserOptions,
) => MaybePromise<any>;

type BodyParserOptions = {
    readonly body: ReadableStream | null,
    text: () => Promise<string>,
    arrayBuffer: () => Promise<ArrayBuffer>,
    blob: () => Promise<Blob>,
    formData: () => Promise<FormData>,

    readonly mediaType?: string,
    readonly boundary?: string, 
    readonly charset?: string,
}
```

Specify the parsers for media-types.


#### serializeParams

Type: `SerializeParamsFunction`\
Default: `Function`

```ts
type SerializeParamsFunction = (params: Record<string, any>) => Record<string, string>
```

#### serializeSearchParams

Type: `SerializeSearchParamsFunction`\
Default: `Function`

```ts
type SerializeSearchParamsFunction = (
    params: Record<string, any[]>
) => Record<string, string[]>
```

#### fetch

Type: `Fetch`\
Default: `fetch`

## client.extends(defaultOptions)

Create a new client instance with some defaults overridden with your own.

```ts
const extended = client.extends({
    prefixUrl: 'https://api.example.com',
    dataTypes: {
        json: 'application/json',
        form: 'multipart/form-data'
    },

    dataSerializers: {},
    bodyParsers: {},

    serializeParams: (params) => {},
    serializeSearchParams: (params) => {},
})
```

## DredgeResponsePromise

Methods are:
- `data` and other dataTypes methods
- `then`
- `catch`
- `finally`

`client` returns `DredgeResponsePromise` which is a `Promise` that resolves to `DredgeResponse`.

`DredgeResponse` is a `Response` object with a promise property `data` which resolves to parsed data according to content-type header.

```ts
type DredgeResponse = globalThis.Response & {
    data: Promise<any>
}
```

```ts
const response = await client.get('/posts')

const data = await response.data()
```

### dredgeResponsePromise.data()

Returns: `Promise<any>`\
alias of: `dredgeResponse.data`

```ts
const data = await client.get('/posts', {
    responseDataType: 'json'
}).data()
```

If you have defined [dataTypes](#datatypes), then you can call those method to get the data, as well set the `accept` header rather than using [responseDataType](#responsedatatype).

```ts
client = client.extends({
  dataTypes: {
        json: 'application/json',
        form: 'multipart/form-data'
    },
})

const data = await client.get('/posts').json() // will be sent as 'Accept: application/json' 
const data = await client.get('/posts').form() // will be sent as 'Accept: multipart/form-data'
```

## HTTPError

```ts
interface HTTPError extends Error {
    name: 'HttpError';
    
    request: Request;
    response: Response;
    options: NormalizedFetchOptions;
}
```