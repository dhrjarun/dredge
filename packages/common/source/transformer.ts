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
        if (typeof value === "string" || value instanceof Blob) {
          formData.append(key, value);
        } else {
          throw "serialization failed";
        }
      });

      return formData;
    },
    deserialize: (object) => {
      return Object.fromEntries(object.entries());
    },
  },
  searchParams: {
    serialize: (object) => new URLSearchParams(object),
    deserialize: (object) => Object.fromEntries(object.entries()),
  },
};
