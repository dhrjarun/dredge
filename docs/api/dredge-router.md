# DredgeRouter

`dredgeRouter` takes array of route or router as argument. Give the router to the adapter to serve the API.

```ts
import { dredgeRouter, dredgeRoute } from 'dredge-route'
import { userRouter } from './user-router'

const router = dredgeRouter([
    userRouter,

    dredgeRoute().path('/hello-world').get().use((req, res) => {
        return res.end({
            data: 'Hello World',
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        })
    })
])
```
