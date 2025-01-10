import { dredgeParamsToSearchParams } from "./params";

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
