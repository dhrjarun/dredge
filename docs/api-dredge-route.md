## dredgeRoute()


```ts
import { dredgeRoute } from 'dredge-route'

const route = dredgeRoute();
```

With initial context. 
```ts
const route = dredgeRoute<{ db: DB }>()
```

## route.path()

```ts
route.path('/user/admin')
route.path('/user').path('/admin') // same as above


route.path('/user/:id') // param
```

## route.params()

```ts
route.params({
	id: z.number()
})
```

For schema, you can use [zod](https://zod.dev), [superstruct](https://docs.superstructjs.org/), [yup](https://github.com/jquense/yup). Before defining schema for param, be sure to define it in path. 

## route.searchParams()

```ts
route.searchParams({
	skip: z.number(), 
})
```

## route.\<method\>() 

Define the method of the route, if the method support body, you can pass schema for the data. Well data is the parsed body. 

```ts
route.path('/posts').get()
route.path('/posts/:id').delete()


route.path('/posts').post(z.object({
	title: z.string(),
	content: z.string()
	createdAt: z.date()
}))

route.path('/posts/:id').put(
	z.object({
		title: z.string().optional(),
		content: z.string().optional(),
		createdAt: z.date().optional()
	})
)
```


## route.use()

```ts
route.use((req, res) => {
	// do something...
})
```

These are the middleware which will run after the success of validation. Checkout [RouteRequest](api-route-request.md) and [RouteResponse](api-route-response.md) for more information.

## route.error()

```ts
route.error((error, req, res) => {
	// do something...
})
```

These are the middleware which will run after the failure of validation or if you throw error in success middleware. Checkout [RouteRequest](api-route-request.md) and [RouteResponse](api-route-response.md) for more information.

## route.options()


### dataType
```ts
route.options({
	dataTypes: {
		json: 'application/json',
		form: 'multipart/form-data',
		yaml: 'application/yaml',
	}
})
```

## route.build()

As of now, you need to call `build()` to get the route object which you can then pass to `dredgeRouter()`.

```ts
const getPostsRoute = dredgeRoute<{ db: DB }>()
    .path('/posts')
    .get()
    .use((req, res) => {
        return res.next({
            data: db.getPosts()
			headers: {
				'content-type': 'application/json'
			}
        })
    })
	.build()
```