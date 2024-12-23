---
"dredge-route": major
"dredge-types": major
---

`ctx` is now `state`
In route middleware, `req`, `res` no longer exist as parameter. Instead `context` and `d` exist now. `context` include `req`, `res`, `error`, `state`. `d` is used to mutate the `res`, `state`.
