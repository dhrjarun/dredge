# Validation

Dredge let you define validations for the [data](data.md), [params](path-and-params.md#params), [search params](search-params.md). You can use [zod](https://zod.dev), [superstruct](https://docs.superstructjs.org/), [yup](https://github.com/jquense/yup), [valibot](https://valibot.dev) and [arktype](https://arktype.io) for creating schema.

On Failure of validation, Dredge will throw [`ValidationError`](../api/validation-error.md). You can handle the error by using [route.error()](middleware.md#error-handling).

## Params

Before defining schema for param, be sure to define path. 

```ts
import { route } from './route'

route.path('/user/:id').params({
	id: z.number()
})
```

## SearchParams
```ts
import { route } from './route'

route.path('/entries').searchParams({
	skip: z.number(), 
})
```

## Data

```ts
import { route } from './route'

route.path('/blog').post(z.object());


route.path('/blog/:id').put(
	z.object().passthrough()
)

route.path('/blog/:id').patch(
	z.object().passthrough()
)
```






