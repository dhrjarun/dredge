# Validation Error

```ts
interface ValidationError extends Error {
    type: "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA",
    issue: any,
}
```

Properties:
- type: Failed at which step
- issue: The error object thrown by the schema validator.
