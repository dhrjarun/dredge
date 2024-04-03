export interface DataTransformer {
  serialize(object: any): any;
  deserialize(object: any): any;
}

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
