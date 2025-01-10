import { trimSlashes } from "./path";

export function searchParamsToDredgeParams(
  searchParams?: URLSearchParams | string | null,
) {
  if (!searchParams) return {};
  const sp =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams);

  const obj: Record<string, string[]> = {};

  for (const key of sp.keys()) {
    const value = sp.getAll(key);
    obj[`?${key}`] = value;
  }
  return obj;
}

export function objectToDredgeParams(
  path: string,
  object: Record<string, any | any[]>,
) {
  const params: Record<string, any | any[]> = {};

  const isParamPath = path.startsWith(":");
  if (isParamPath) {
    let _path = trimSlashes(path.slice(1));
    const pathArray = _path.split("/");

    pathArray.forEach((item) => {
      if (item.startsWith(":")) {
        params[item] = object[item.slice(1)];
      }
    });
  }

  Object.entries(object).forEach(([key, value]) => {
    if (Object.hasOwn(params, `:${key}`)) return;

    params[`?${key}`] = value instanceof Array ? value : [value];
  });

  return params;
}

export function dredgeParamsToSearchParams(
  obj: Record<string, string | string[]>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith(":")) continue;

    const name = key.slice(1);

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(name, String(item));
      }
    } else {
      searchParams.append(name, String(value));
    }
  }
  return searchParams;
}
