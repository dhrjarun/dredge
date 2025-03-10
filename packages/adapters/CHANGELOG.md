# dredge-adapters

## 2.0.0

### Major Changes

- d8fd40a: BodyParserFunction and DataSerializerFunction now contain contentType in option instead of mediaType, charset and boundary
- f25bb59: replace searchParam(s) to query/queries
- f951cde: `ctx` options is now called `state`

### Patch Changes

- Updated dependencies [164b922]
- Updated dependencies [f25bb59]
- Updated dependencies [a0c09fa]
- Updated dependencies [a0c09fa]
- Updated dependencies [164b922]
- Updated dependencies [a0c09fa]
- Updated dependencies [a0c09fa]
- Updated dependencies [d8fd40a]
- Updated dependencies [4e2aa47]
- Updated dependencies [f951cde]
  - dredge-common@1.0.0
  - dredge-route@2.0.0
  - dredge-types@2.0.0

## 1.0.4

### Patch Changes

- `createFetchRequestHandler` is no longer async function

## 1.0.3

### Patch Changes

- Updated dependencies [fe896eb]
- Updated dependencies [43ffd61]
- Updated dependencies [5f63bcd]
- Updated dependencies [0635e0c]
  - dredge-route@1.0.0
  - dredge-types@1.0.0
  - dredge-common@0.6.0

## 1.0.2

### Patch Changes

- Updated dependencies [8983a68]
- Updated dependencies [c7ff717]
- Updated dependencies [9e74dfb]
- Updated dependencies [e6b8c75]
  - dredge-types@0.5.0
  - dredge-route@0.5.0

## 1.0.1

### Patch Changes

- Updated dependencies [878dea2]
  - dredge-types@0.4.6
  - dredge-route@0.4.7

## 1.0.0

### Major Changes

- 7df3817: hadleFetchRequest is now createFetchRequestHandler

## 0.5.9

### Patch Changes

- Fix Typescript: TS2742 issue within fetch adapter

## 0.5.8

### Patch Changes

- Fix url and prefix url issue of fetch adapter

## 0.5.7

### Patch Changes

- Updated dependencies
  - dredge-types@0.4.5
  - dredge-route@0.4.6

## 0.5.6

### Patch Changes

- - Updated dependencies
    - dredge-types
- Updated dependencies
  - dredge-route@0.4.5

## 0.5.5

### Patch Changes

- Updated dependencies
  - dredge-common@0.5.3
  - dredge-route@0.4.4

## 0.5.4

### Patch Changes

- Updated dependencies
  - dredge-route@0.4.3

## 0.5.3

### Patch Changes

- Updated dependencies
  - dredge-types@0.4.3
  - dredge-route@0.4.2

## 0.5.2

### Patch Changes

- update package.json entries
- Updated dependencies
  - dredge-common@0.5.2
  - dredge-route@0.4.2
  - dredge-types@0.4.2

## 0.5.1

### Patch Changes

- default condition in package.json exports field should be last one
- Updated dependencies
  - dredge-common@0.5.1
  - dredge-route@0.4.1
  - dredge-types@0.4.1

## 0.5.0

### Minor Changes

- adapters now has default json and text bodyParser and dataSerializer

### Patch Changes

- Updated dependencies [d10e27b]
- Updated dependencies
  - dredge-types@0.4.0
  - dredge-route@0.4.0
  - dredge-common@0.5.0

## 0.4.0

### Minor Changes

- Fix few minor issues

### Patch Changes

- Updated dependencies
  - dredge-common@0.4.0
  - dredge-route@0.3.0
  - dredge-types@0.3.0

## 0.3.1

### Patch Changes

- fix dredge-adapters types issue

## 0.3.0

### Minor Changes

- deserializeParams and deserializeSearchParams has default values in adapters
- replace routes with router field in adapters

### Patch Changes

- Updated dependencies
  - dredge-common@0.3.0
  - dredge-route@0.2.0

## 0.2.0

### Minor Changes

- Initial Release

### Patch Changes

- Updated dependencies
  - dredge-common@0.2.0
  - dredge-route@0.2.0
  - dredge-types@0.2.0
