# dredge-route


## Install

```
npm install dredge-route 
```

## Usage

```ts
import { dredgeRoute, dredgeRouter } from 'dredge-route'
import z from 'zod'

type InitialContext = {db: ..., session: ...}
const simpleRoute = dredgeRoute<InitialContext>().options({
	dataTypes: {
		json: 'application/json',
		yaml: 'application/yaml',
		form: 'multipart/form-data'
	}
});

const protectedRoute = simpleRoute.use((req, res) => {
	if(!res.ctx.session) {
		throw "Forbidden";
	}
})

const userRoute = protectedRoute
	.path('/user/:id')
	.params({
		id: z.number().uuid()
	})
	.serarchParams({
		numberSp: z.number(),
		booleanSp: z.boolean(),
		dateSp: z.date()
	})
	.post(
		// data or parsed-body schema
		z.object({
			...
		})
	) 
	.use((req, res) => {
		const ... = req.param('id'); // number
		
		const ... = req.searchParam('numberSp'); // number
		const ... = req.searchParams('numberSp') // number[]
		const ... = req.searchParam('dateSp') // Date
		
	
		const ... = req.header('content-type')

		// based on dataTypes property of options, it will determine dataType from content-type header.
		const dataType = req.dataType;

		// data is the parsed version of request body.
		const data = req.data;

		const ctx = res.ctx; // access initial Context

		// set response header, status, and modify context.
		return res.next({
			ctx: {
				'prop': "add new property to ctx"
			},
			headers: {
				
			},
			status: 200,	
		})
	})
	.use((req, res) => {
		const ... = res.ctx; // access modified ctx;
		const ... = res.status // 200,
		
		// res.end will skip further execution of middleware
		return res.end({
			data: ..., // data which becomes body after serialization.
			headers: {
				'content-type': 'application/json'
			},
			statusText: 'ok'
		})

		// to send 'application/json'
		return res.end({
			json: ...
		})

		// to send 'application/yaml'
		return res.end({
			yaml: ...
		})
	})
	.error((err, req, res) => {
		// error is similar to use, these error middlewares will be called, validation fail or if error throw in use middlewares. 

		return res.end({
			json: err,
			status: 400,
		})
	})

export const rootRouter = dredgeRouter([
	userRoute,
	route
    	.path("/hello-world")
    	.get()
    	.use((req, res) => {
    	  res.end({
    	    data: "hello-world",
    	    headers: {
    	      "content-type": "text/plain",
    	    },
    	  });
    	})
    	.build(),
])

export type RootRouter = typeof rootRouter
```

