export function validatePath(...paths: string[]) {
  const pathRegex = /[a-z A-Z 0-9 . - _ ~ ! $ & ' ( ) * + , ; = : @]+/;
  paths.forEach((item) => {
    if (!pathRegex.test(item)) {
      throw `invalid path ${item}`;
    }
  });
}
