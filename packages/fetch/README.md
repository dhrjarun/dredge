# dredge-fetch

This package contains fetch client for dredge.

## Install
```
npm install dredge-fetch
```

## Usage
```ts
import { dredgeFetch } from 'dredge-fetch'
import type { RootRouter } from './root-router'

const client = dredgeFetch<RootRouter>();

const response = client('/user/1', {  
	method: 'post',
	body: {
		name: 'dhiraj'
	}
});
```