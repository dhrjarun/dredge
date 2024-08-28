# dredge

Dredge is a typescript library for building TypeSafe rest APIs.

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
- [Quick Start](docs/quick-start.md)
### API 
- [dredgeRoute](docs/api-dredge-route.md)
- [RouteRequest](docs/api-route-request.md)
- [RouteResponse](docs/api-route-response.md)
- [dredgeRouter](docs/api-dredge-router.md)
- [dredgeAdapters](docs/api-adapters.md)
- [dredgeFetch](docs/api-dredge-fetch.md)

## Team

As of now, I ([Dhiraj Arun](https://github.com/dhrjarun)) am the only contributor to this project. You can contact me on [X](https://x.com/dhrjarun).


## Credits
Dredge borrows ideas from project like [tRPC](https://trpc.io/), [ky](https://github.com/sindresorhus/ky), [hono](https://hono.dev), [node-fetch](https://github.com/node-fetch/node-fetch). Not just ideas but also codes from some of these projects.
