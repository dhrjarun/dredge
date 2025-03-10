# dredge-route

## 2.0.0

### Major Changes

- f25bb59: replace searchParam(s) to query/queries
- a0c09fa: Replace request, response param and header method with headers and params field
- a0c09fa: router.find() now takes url and prefixUrl instead of pathArray
- a0c09fa: validation logic in route is now middleware
- a0c09fa: add route.\_schema.(params.\* | input | output) fields returns DredgeSchema
- 4e2aa47: add route.input() and route.output()
  route.<method>(parser) no longer work
- f951cde: `ctx` is now `state`
  In route middleware, `req`, `res` no longer exist as parameter. Instead `context` and `d` exist now. `context` include `req`, `res`, `error`, `state`. `d` is used to mutate the `res`, `state`.

### Minor Changes

- 164b922: `dataTypes` field now accept contentType instead of mediaType

### Patch Changes

- Updated dependencies [164b922]
- Updated dependencies [f25bb59]
- Updated dependencies [a0c09fa]
- Updated dependencies [a0c09fa]
- Updated dependencies [a0c09fa]
- Updated dependencies [a0c09fa]
- Updated dependencies [d8fd40a]
- Updated dependencies [4e2aa47]
- Updated dependencies [f951cde]
  - dredge-common@1.0.0
  - dredge-types@2.0.0

## 1.0.0

### Major Changes

- 5f63bcd: `.build()` method is no longer needed in dredgeRoute creation

### Minor Changes

- fe896eb: Implement support for Valibot as parser

### Patch Changes

- Updated dependencies [fe896eb]
- Updated dependencies [43ffd61]
- Updated dependencies [5f63bcd]
- Updated dependencies [0635e0c]
  - dredge-types@1.0.0
  - dredge-common@0.6.0

## 0.5.0

### Minor Changes

- 9e74dfb: SearchParam without scheam defined can be retrieved now
- e6b8c75: Remove unwanted fields from route.options like `defaultContext`, `dataTransformer`, `dataSerializers`, `bodyParsers`

### Patch Changes

- c7ff717: Fix dredgeRouter not throwing error on duplicate route and more than one dynamic path on same level
- Updated dependencies [8983a68]
- Updated dependencies [e6b8c75]
  - dredge-types@0.5.0

## 0.4.7

### Patch Changes

- Updated dependencies [878dea2]
  - dredge-types@0.4.6

## 0.4.6

### Patch Changes

- Updated dependencies
  - dredge-types@0.4.5

## 0.4.5

### Patch Changes

- - Updated dependencies
    - dredge-types

## 0.4.4

### Patch Changes

- Updated dependencies
  - dredge-common@0.5.3

## 0.4.3

### Patch Changes

- Fix dependecies in package.json

## 0.4.2

### Patch Changes

- update package.json entries

## 0.4.1

### Patch Changes

- default condition in package.json exports field should be last one

## 0.4.0

### Minor Changes

- Fix type issues in client when There exist for static and dynamic path in same position. like /user/:id and /user/admin
- static path no longer has duplicate path inference
  - Before: `':/user/admin' | '/user/admin`
  - After: `'/user/admin'`

## 0.3.0

### Minor Changes

- Fix few minor issues

## 0.2.0

### Minor Changes

- Initial Release
