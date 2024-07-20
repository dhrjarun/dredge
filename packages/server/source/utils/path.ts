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
