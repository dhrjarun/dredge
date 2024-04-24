export * from "./dredge";

// TODO
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

// resolver method in route must return different type -- the final type which will be taken by api builder
// improve isAnyRoute type https://github.com/ts-essentials/ts-essentials/blob/9935d80a3c338b05577d7d012db81425ed770c14/lib/is-any/index.ts
// change sendFn so that (data, options) like this
// find better way to provide contentType in client and sendFn
// support for accept req header and automatically adding contentType in res
// support for setting response headers with middleware
// better error objects and handling of it
// better names
// docs on public functions
// refactor inferResolverOption
// cookies

// setup versioning and changelog
// add Readme.MD, CONTRIBUTING.md, licence
// publish to npm
// setup the docs site with astro
