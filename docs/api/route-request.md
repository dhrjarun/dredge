# RouteRequest

RouteRequest is an object you can access it success middleware as well error middleware. 

## url

```ts
route.path('/entry').use((req, res) => {
	const url = req.url // http://localhost:3000/entry 
})
```

## method

```ts
route.path('/entry').get().use((req, res) => {
	const method = req.method; // get
})
```

## param()

```ts
// /entry/123/456
route.path('/entry/:id/:subId').use((req, res) => {
	// Get single param
	const id = req.param('id'); // '123'
	const subId = req.param('subId'); // '456'

	// Get all params at once
	const { id, subId } = req.param();
})
```

## searchParam()
Get single querystring parameter value.

```ts
// /search?limit=10&skip=20
route.path('/search').get().use((req, res) => {
	// Get single searchParam
    const limit = req.searchParam('limit'); // '10'
    const skip = req.searchParam('skip'); // '20'

    // Get all searchParams at once
    const { limit, skip } = req.searchParams();
})
```

## searchParams()
Get multiple querystring parameter values.

```ts
// /search?tags=A&tags=B
route.path('/search').get().use((req, res) => {
    const tags = req.searchParams('tags'); // ['A', 'B']

    const { tags } = req.searchParams();
})

```

## header()

```ts
route.path('/entry').get().use((req, res) => {
	// Get single header
	const ct = req.header('content-type');

	// Get all headers at onces
	const headers = req.header();
})
```

## data
There is no body in RouteRequest, What we have is parsed body which we call data.

```ts
route.path('/entry').post().use((req, res) => {
	const data = req.data; // parsed body
})
```

## dataType

Based on the `content-type` header, dredge-route will set the `dataType` field, as specified in `dredgeRoute.options()`.

```ts
route
    .options({
        json: 'application/json',
        form: 'multipart/form-data'
    })
    .path('/entry')
    .post()
    .use((req, res) => {
        const ct = req.header('content-type'); // 'application/json'
        const dataType = req.dataType; // 'json'
    })
```







