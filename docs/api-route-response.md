# RouteResponse

RouteResponse is an object you can access it success middleware as well error middleware. This object will be used to send the HTTP response. 

## next()

Update the context, add or remove response header or set status, statusText and dataType. You can set the response data as well, but we would recommend doing that using `end()`. Be sure to return, otherwise it will not work.

```ts
route.path('/entry').get().use((req, res) => {
	return res.next({
		headers: {
			'content-type': 'application/json',
			'content-length': null // remove this header 
		},
		ctx: {
			info: "running next..."
		}
		status: 200,
		statusText: 'ok',
	})
})
```

## end()

Same as `next()` except you can't update `ctx` and It will skip the execution of any further middleware. Be sure to return this as well. 

```ts
route
	.options({
		dataTypes: {
            json: 'application/json',
		    form: 'multipart/form-data'
        }
	})
	.path('/entry')
	.get()
	.use((req, res) => {
		return res.end({
			data: {
				isSuccess: true
			},
			dataType: 'json'
		})
	})

```

Setting the response `dataType` will set the `content-type` header. Instead of using `dataType` field, you can do something like this.

```ts
route
	.options({
		dataTypes: {
            json: 'application/json',
		    form: 'multipart/form-data'
        }
	})
	.path('/entry')
	.get()
	.use((req, res) => {
		return res.end({
			json: {
				isSuccess: true
			},
		})
	})
```
## ctx

```ts
import { dredgeRoute } from 'dredge-route'

dredgeRoute<{ db: DB }>().path('/entry').get()
    .use((req, res) => {
        const ctx = res.ctx; // { db: DB }
        
        return res.next({
            ctx: {
                info: 'running next...'
            }
        })
    })
    .use((req, res) => {
        const ctx = res.ctx; // { db: DB, info: 'running next...' }
    })
```

## header()

```ts
route.path('/entry').get().use((req, res) => {
	// Get single header
	const ct = res.header('content-type');

	// Get all headers at onces
	const headers = res.header();
})
```

## status   

```ts
route
    .path('/entry')
    .get()
    .use((req, res) => {
        const status = res.status; // undefined

        return res.next({
            status: 200
        })
    })
    .use((req, res) => {
        const status = res.status; // 200
    })
```
## statusText

```ts
route
    .path('/entry')
    .get()
    .use((req, res) => {
        const statusText = res.statusText; // undefined
        return res.next({
            statusText: 'ok'
        })
    })
    .use((req, res) => {
        const statusText = res.statusText; // 'ok'
    })
```

## data

`data` of RouteResponse will be serialized according to `content-type` header to generate the response body. In order for `dredgeRoute` to infer the type of response data, use `res.end()` to set data, not `res.next()`. 

```ts
route.path('/entry').get()
    .use((req, res) => {
        const data = res.data; // undefined

        return res.next({
            data: 'some data'
        })
    })
    .use((req, res) => {
        const data = res.data; // 'some data'
    })
```

## dataType

If request has `accept` header then based on `dataTypes` option of `dredgeRoute`, it will set the response dataType property.


```ts
route
    .options({
        dataTypes: {
            json: 'application/json',
            form: 'multipart/form-data',
            xml: 'application/xml'
        }
    })
    .path('/entry')
    .get()
    .use((req, res) => {
        const accept = req.header('accept'); // application/json
        const dataType = res.dataType; // json
    })
```

