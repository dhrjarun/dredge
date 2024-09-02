# dredge

Dredge is a typescript library for building TypeSafe rest APIs without code generation.

## Features

- TypeSafe APIs - for request body, response body, params, search params 
- Full AutoCompletion - No need to remember any endpoints
- Simple Dx - No code generation, simple design
- Batteries Included
- Ultrafast & Lightweight

## Structure

| Package | Description |
| -------------------------------------- | -------------------------------- |
| [dredge-route](packages/route/)        | Build routes for your API        |
| [dredge-adapters](packages/adapters/)  | Adapters to serve the API        |
| [dredge-fetch](packages/fetch/)        | HTTP Fetch client                |
| [dredge-types](packages/types/)        | Internal lib storing types       |
| [dredge-common](packages/common/)      | Internal lib storing common code |

## Documentation

### Guide
- [Quick Start](docs/guide//quick-start.md)
- [Route and Router](docs/guide/route-and-router.md)
- [Adapter](docs/guide/adapter.md)
- [Validation](docs/guide/validation.md)
- [Middleware](docs/guide/middleware.md)
- [Context](docs/guide/context.md)
- [Path and Params](docs/guide/path-and-params.md)
- [SearchParams](docs/guide/search-params.md)
- [Data](docs/guide/data.md)

### API
- [dredgeRoute](docs/api/dredge-route.md)
- [RouteRequest](docs/api/route-request.md)
- [RouteResponse](docs/api/route-response.md)
- [dredgeRouter](docs/api/dredge-router.md)
- [dredgeAdapters](docs/api/adapters.md)
- [dredgeFetch](docs/api/dredge-fetch.md)
- [ValidationError](docs/api/validation-error.md)

## Examples
- Demo (in NextJS) [Github](https://github.com/dhrjarun/dredge-demo) [Stackblitz](https://stackblitz.com/github/dhrjarun/dredge-demo)

## Team

As of now, I ([Dhiraj Arun](https://github.com/dhrjarun)) am the only contributor to this project. You can contact me on [X](https://x.com/dhrjarun).


## Credits
Dredge borrows ideas from project like [tRPC](https://trpc.io/), [express](https://expressjs.com), [ky](https://github.com/sindresorhus/ky), [hono](https://hono.dev), [node-fetch](https://github.com/node-fetch/node-fetch). Not just ideas but also codes from some of these projects.
