import { deserializeValue } from "./deserialize-params";
import { dredgeParamsToSearchParams } from "./params";
import { DredgeSchema } from "./schema/schema";

export function isSinglePathValid(...paths: string[]) {
  const pathRegex = /^[a-zA-Z0-9\.\-_~]+$/g;

  for (const path of paths) {
    if (!pathRegex.test(path)) {
      return false;
    }
  }

  return true;
}

export function isPathnameValid(pathName: string) {
  const pathRegex = /^(\/)?([a-zA-Z0-9\.\-_~]+\/?)*$/g;
  return pathRegex.test(pathName);
}

export function isValidPrefixUrl(prefixUrl: string) {
  try {
    const url = new URL(prefixUrl);
    return true;
  } catch (err) {
    return false;
  }
}

// from trpc
export const trimSlashes = (path: string): string => {
  path = path.startsWith("/") ? path.slice(1) : path;
  path = path.endsWith("/") ? path.slice(0, -1) : path;

  return path;
};

export function createURL(options: {
  prefixUrl: string;
  path: string;
  params?: Record<string, string | string[]>;
}) {
  let { prefixUrl, path, params = {} } = options;

  if (!prefixUrl.endsWith("/")) {
    prefixUrl += "/";
  }
  const simplePath = trimSlashes(getSimplePath(path, params));

  let search = dredgeParamsToSearchParams(params).toString();
  let url = prefixUrl + simplePath;
  if (search) {
    url += "?" + search;
  }

  return url;
}

export function getSimplePath(
  path: string,
  params: Record<string, string | string[]>,
) {
  const isParamPath = path.startsWith(":");

  if (!isParamPath) return path;

  let _path = trimSlashes(path.slice(1));

  const pathArray = _path.split("/");

  const simplePathArray = pathArray.map((item) => {
    if (item.startsWith(":")) {
      const param = params[item];

      if (!param) throw "Can't find specified param";

      return param;
    }
    return item;
  });

  return `/${simplePathArray.join("/")}`;
}

export function deserializePath(
  url: string,
  schema: {
    paths: string[];
    params: Record<string, DredgeSchema | null>;
    prefixUrl?: string;
  },
) {
  const _prefixUrl = new URL(
    schema.prefixUrl || "relative:///",
    "relative:///",
  );
  const _url = new URL(url, _prefixUrl);
  const pathname = trimSlashes(_url.pathname.slice(_prefixUrl.pathname.length));
  const searchParams = _url.searchParams;

  const pathArray = pathname.split("/");

  const params: Record<string, any> = {};

  for (const [index, item] of schema.paths.entries()) {
    if (!item.startsWith(":")) {
      continue;
    }

    const s = schema.params[item.slice(1)];
    const value = pathArray[index];

    if (!s || !value) {
      continue;
    }

    params[item.slice(1)] = deserializeValue(value, s);
  }

  for (const key of searchParams.keys()) {
    const s = schema.params[key];

    if (!s) {
      continue;
    }

    params[key] = deserializeValue(
      s.type === "array"
        ? searchParams.getAll(key)
        : searchParams.get(key) || "",
      s,
    );
  }

  return params;
}
