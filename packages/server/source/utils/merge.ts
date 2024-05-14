/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item: unknown): item is object {
  return !!(item && typeof item === "object" && !Array.isArray(item));
}

// https://stackoverflow.com/a/34749873
/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target: object, ...sources: object[]) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

export function mergeHeaders(
  target: Record<string, string>,
  source: Record<string, string | null>,
) {
  const headers = { ...target };
  for (const header in source) {
    // https://nodejs.org/api/http.html#messageheaders
    if (!source[header]) {
      delete headers[header];
    } else {
      headers[header.toLowerCase()] = source[header]!;
    }
  }
  return headers;
}
