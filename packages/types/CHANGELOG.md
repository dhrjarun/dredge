# dredge-types

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
