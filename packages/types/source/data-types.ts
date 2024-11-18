export interface DataTypes {
  toRecord(): Record<string, string>;
  keys(): string[];
  getContentTypeHeader(dataType: string): string | undefined;
  getAcceptHeader(dataType: string): string | undefined;
  getDataTypeFromContentType(contentType: string): string | undefined;
  getDataTypeFromAccept(accept: string): string | undefined;
}
