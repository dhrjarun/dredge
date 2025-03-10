# dredge-types

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

## 1.0.0

### Major Changes

- 5f63bcd: `.build()` method is no longer needed in dredgeRoute creation

### Minor Changes

- fe896eb: Implement support for Valibot as parser

### Patch Changes

- 43ffd61: Fix `inferParserType` issue with `ParserWithInputOutput`

## 0.5.0

### Minor Changes

- e6b8c75: Remove unwanted fields from route.options like `defaultContext`, `dataTransformer`, `dataSerializers`, `bodyParsers`

### Patch Changes

- 8983a68: Remove dataTransformer option from client

## 0.4.6

### Patch Changes

- 878dea2: Fix client type issue due to path type

## 0.4.5

### Patch Changes

- fix type issue for data in client

## 0.4.4

## 0.4.3

### Patch Changes

- Fix client path type issue when there are two routes with same static path but different method

## 0.4.2

### Patch Changes

- update package.json entries

## 0.4.1

### Patch Changes

- default condition in package.json exports field should be last one

## 0.4.0

### Minor Changes

- Fix type issues in client when There exist for static and dynamic path in same position. like /user/:id and /user/admin
- static path no longer has duplicate path inference like this
  - Before: `':/user/admin' | '/user/admin`
  - After: `'/user/admin'`

## 0.3.0

### Minor Changes

- Fix few minor issues

## 0.2.0

### Minor Changes

- Initial Release
