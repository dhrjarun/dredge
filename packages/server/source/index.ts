export * from "./dredge";

// ----------------
// TODO: DONE
// ----------------

// add types to resolveRoute
// make data() in ResolverResult return Promise
// refactor fetchClient option type
// create dredgeFetch instance creator
// delete outdated codes
// add data method on resolverResultPromise
// fix ctx in api when it is optional, also generic ctx problem by creating initDredge
// test resolveRoute
// fix adapter type problems
// add defaultErrorResolver
// test fetch adapter
// fix fetch option in client
// test dredge-fetch client
// fix without body error
// test formData body in req and res
// setup tsup
// setup eslint, prettier or rome
// add more options for dredgeFetch
// make fetch option in fetchClient and resolveRoute optional if every option is optional specifically if data or searchParams are not required
// improve isAnyRoute type https://github.com/ts-essentials/ts-essentials/blob/9935d80a3c338b05577d7d012db81425ed770c14/lib/is-any/index.ts
// resolver method in route must return different type -- the final type which will be taken by api builder

// ----------------
// TODO
// ----------------

// support for setting response headers with middleware []
// req, res
// req.path, req.params, req.searchParams, req.headers, req.data, [readonly]
// res.status, res.statusText, res.headers, res.data, [readonly]
// ctx, next() send() [should these be in request or response]?
// fix unknown data type bug

// path function in root getting single string argument
// header types

// change sendFn so that (data, options) like this [no need to do this]
// support for accept req header and automatically adding contentType in res [can be implemented by middleware so no need to do so]

// find better way to provide contentType in client and sendFn | either using fields like { data, dataAsJson, datAsFormData, dataAsUrlEncoded } [should it has `as` or simple, json, urlEncoded, formData]
// or using header { contentType }
// or using header { '$contentType': "application/json" | "multipart/form-data" | 'text/plain' | "application/x-www-form-urlencoded" } [since contentType no just has content part, it can have charset, for formData it has boundary]
// text/javascript; charset=UTF-8

// hooks and instance creation
// better error objects and handling of it
// better names
// docs on public functions
// refactor inferResolverOption
// cookies

// setup versioning and changelog
// add Readme.MD, CONTRIBUTING.md, licence
// publish to npm
// setup the docs site with astro

type inferP<T> = T extends `${infer P}/${infer Rest}`
  ? [P, ...inferP<Rest>]
  : T extends `/${infer P}`
    ? [P]
    : [T];
type RE<T extends Array<string>> = T extends [
  infer P,
  ...infer Rest extends string[],
]
  ? P extends ""
    ? RE<Rest>
    : [P, ...RE<Rest>]
  : [];

type x = inferP<"/good/bad/no/go/">;
type xx = RE<x>;
