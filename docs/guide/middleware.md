# Middleware

Middleware is a function which has access to the [request](../api//route-request.md), [response](../api/route-response.md) object. In the middleware, you can execute the code, or modify the response object. You can define one or more middlewares for a route.

Register route middleware using `route.use()` or `route.error()`. After [validation](validation.md), if it did not failed, all `route.use()` middleware will be executed in the order they are defined. The execution will stop if one of them calls `res.end()` or if an error is thrown in the middleware. On throw of error or on failure of validation, all the `route.error()` middleware will be executed in order, until one of them calls `res.end()`. 

## Request and Response Object

Inside `route.use()`. 
```ts
import { route } from './route'

route.use((req, res) => {
    // Access the request object
    const method = req.method // string
    const path = req.path // string
    const params = req.params() // Record<string, any>
    const searchParam = req.searchParam() // Record<string, any>
    const searchParams = req.searchParams() // Record<string, any[]>
    const data = req.data // Record<string, any>
})

```

## Update Response Object

You can update the response object by using `res.next()`. But be sure to return it. With `res.next()`, You can update `status`, `statusText`, `headers`, `dataType`, `ctx` and even `data`.

```ts
route.use((req, res) => {
    return res.next({
        ctx: {
            info: 'some info',
        }
        status: 200,
        statusText: 'OK',
        headers: {
            'Content-Type': 'text/plain',
        },
        dataType: 'json',
        data: 'Data',
    })
}).use((req, res) => {
    // Access the updated response object

    const ctx = res.ctx // { info: 'some info' }
    const status = res.status // 200
    const statusText = res.statusText // OK
    const headers = res.header() // { 'Content-Type': 'text/plain' }
    const dataType = res.dataType() // json
    const data = res.data() // 'Data'
})
```

## End Response

Calling and returning `res.end()` in the middleware will stop the execution of any further middlewares and response will be sent. You don't always need to call `res.end()`, response will be sent eventually after all the middlewares are executed. You can modify the response object with it as well, except the `ctx` object. If you are sending [data](data.md), you should set it in `res.end()` instead of `res.next()`, otherwise you will not get type inference for the `data`.

```ts
route.use((req, res) => {
    return res.end({
        data: 'Hello World',
        headers: {
            'Content-Type': 'text/plain'
        }
    })
})
```

## Error Handling

`route.error()` is same as `route.use()`, it just has access to error along with [request](../api/route-request.md) and [response](../api/route-response.md) object. Request object is not validated in error handler.You can update the response object and terminate the execution the same way as in `route.use()`.

```ts
route.error((error, req, res) => {

})
```




