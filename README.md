# dredge

Dredge is a typescript library for building TypeSafe rest APIs without code generation.

<div align="center">
  <video src="media/say-my-name.mp4" width="500px"></video> 
</div>

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

Visit [dredge.dhrjarun.com](https://dredge.dhrjarun.com) for documentation.

## Team

As of now, I ([Dhiraj Arun](https://github.com/dhrjarun)) am the only contributor to this project. You can contact me on [X](https://x.com/dhrjarun).

## Acknowledgement
Dredge borrows ideas from project like [tRPC](https://trpc.io/), [express](https://expressjs.com), [ky](https://github.com/sindresorhus/ky), [hono](https://hono.dev), [node-fetch](https://github.com/node-fetch/node-fetch). Not just ideas but also codes and docs from some of these projects.
