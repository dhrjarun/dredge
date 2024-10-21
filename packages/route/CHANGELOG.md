# dredge-route

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
