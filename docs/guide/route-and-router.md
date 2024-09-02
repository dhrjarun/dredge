# Route & Router

Route define a particular API endpoint which is a URI (or path) and a specific HTTP request method (GET, POST, PUT, DELETE, etc.).


Import `dredgeRoute` to create a Route. It uses immutable builder pattern.

In route, You can define [validators](validation.md) and one or more handler function also called [middlewares](middleware.md). When the route matches, the validation will be executed and then middlewares will be executed.

```ts
import { dredgeRoute } from 'dredge-route';

const route = dredgeRoute();

const GetUsersRoute = route.path('/users').get().use((req, res) => {}).build()
```

## Router

Router is a collection of route (and/or other routers). Import `dredgeRouter` to create a router. 

```ts
import { dredgeRouter } from 'dredge-route';
import { GetUsersRoute } from './route'

export const rootRouter = dredgeRouter([GetUsersRoute]);
export type RootRouter = typeof rootRouter;
```

Export the created router as well its Type.