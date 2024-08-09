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
export function mergeDeep(
  target: Record<string, any>,
  ...sources: Record<string, any>[]
) {
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
