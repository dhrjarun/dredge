export interface Transformer {
  json: {
    serialize(object: any): string;
    deserialize(object: string): any;
  };
  formData: {
    serialize(object: any): FormData;
    deserialize(object: FormData): any;
  };
  searchParams: {
    serialize(object: any): URLSearchParams;
    deserialize(object: URLSearchParams): any;
  };
}

export const defaultTransformer: Transformer = {
  json: {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  },
  formData: {
    serialize: (object) => {
      const formData = new FormData();
      Object.entries(object).forEach(([key, value]) => {
        if (
          typeof value === "string" ||
          value instanceof Blob ||
          value instanceof File
        ) {
          formData.append(key, value);
        } else {
          throw "serialization failed";
        }
      });

      return formData;
    },
    deserialize: (object) => {
      const data = Object.fromEntries(object.entries());

      return data;
    },
  },
  searchParams: {
    serialize: (object) => new URLSearchParams(object),
    deserialize: (object) => Object.fromEntries(object.entries()),
  },
};

export function populateTransformer(
  transformer: Partial<Transformer> = {},
): Transformer {
  const _transformer = defaultTransformer;

  Object.entries(transformer).forEach(([key, value]) => {
    if (value) {
      (_transformer as any)[key] = value;
    }
  });

  return _transformer;
}
