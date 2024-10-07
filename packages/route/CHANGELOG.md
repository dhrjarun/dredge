# dredge-route

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
