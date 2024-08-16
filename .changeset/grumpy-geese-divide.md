---
"dredge-types": minor
"dredge-route": minor
---

- Fix type issues in client when There exist for static and dynamic path in same position. like /user/:id and /user/admin
- Only static path no longer has duplicate path inference like this
  Before: `':/user/admin' | '/user/admin`
  After: `'/user/admin'`

