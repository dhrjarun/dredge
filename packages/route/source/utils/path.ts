export function validatePath(...paths: string[]) {
  const pathRegex = /[a-z A-Z 0-9 . - _ ~ ! $ & ' ( ) * + , ; = : @]+/;
  paths.forEach((item) => {
    if (!pathRegex.test(item)) {
      throw `invalid path ${item}`;
    }
  });
}

// from trpc
export const trimSlashes = (path: string): string => {
  path = path.startsWith("/") ? path.slice(1) : path;
  path = path.endsWith("/") ? path.slice(0, -1) : path;

  return path;
};
