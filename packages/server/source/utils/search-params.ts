export function searchParamsToObject(
  searchParams: URLSearchParams,
): Record<string, string[]> {
  const obj: Record<string, string[]> = {};

  for (const key of searchParams.keys()) {
    const value = searchParams.getAll(key);
    obj[key] = value;
  }
  return obj;

  // const obj: Record<string, string | string[]> = {};
  // for (const key of searchParams.keys()) {
  //   const value = searchParams.getAll(key);
  //   obj[key] = value.length > 1 ? value : value[0]!;
  // }
  // return obj;
}

export function normalizeSearchParamObject(
  obj: Record<string, string | string[]>,
) {
  const newObj: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(obj)) {
    newObj[key] = value instanceof Array ? value : [value];
  }
  return newObj;
}

export function objectToSearchParams(
  obj: Record<
    string,
    string | number | boolean | (string | number | boolean)[]
  >,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
    } else {
      searchParams.append(key, String(value));
    }
  }
  return searchParams;
}
