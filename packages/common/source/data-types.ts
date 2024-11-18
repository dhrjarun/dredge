export class DataTypes {
  private keyAndCtMap = new Map<
    string,
    {
      type?: string;
      params: Record<string, string>;
      value: string;
    }
  >();

  private mediaAndKeyMap = new Map<string, string>();

  constructor(dataTypesInit: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(dataTypesInit)) {
      if (!validateDataTypeName(key)) {
        throw new TypeError(`Invalid data type name: ${key}`);
      }

      const ct = parseContentType(value);
      if (!ct?.type) {
        throw new TypeError(`Invalid content type: ${value}`);
      }

      this.keyAndCtMap.set(key, {
        ...ct,
        value,
      });
      this.mediaAndKeyMap.set(ct.type, key);
    }
  }

  keys() {
    return Array.from(this.keyAndCtMap.keys());
  }

  toRecord() {
    const record: Record<string, string> = {};

    for (const [key, { value }] of this.keyAndCtMap.entries()) {
      record[key] = value;
    }

    return record;
  }

  getContentTypeHeader(dataType: string) {
    const ct = this.keyAndCtMap.get(dataType);
    if (!ct) return;

    return ct.value;
  }

  getAcceptHeader(dataType: string) {
    const ct = this.keyAndCtMap.get(dataType);
    if (!ct) return;

    return ct.type;
  }

  getDataTypeFromContentType(contentType: string) {
    const ct = parseContentType(contentType);
    if (!ct?.type) return;

    const dataType = this.mediaAndKeyMap.get(ct.type);
    if (!dataType) return;

    return dataType;
  }

  getDataTypeFromAccept(accept: string) {
    const accepts = parseAccept(accept);
    const sortedAccepts = sortAcceptByQFactor(accepts);

    for (const item of sortedAccepts) {
      const dataType = this.mediaAndKeyMap.get(item.type);
      if (!dataType) continue;
      return dataType;
    }
  }
}

export function validateContentType(contentType: any) {
  if (!contentType) return false;

  const [mime, ...params] = contentType.trim().split(";");

  const mimeRegex = /[a-z\-]+\/[a-z\-]+/g;
  const paramRegex = /[a-z]+=.*/;

  if (!mimeRegex.test(mime)) return false;
  for (const item of params) {
    if (!paramRegex.test(item)) return false;
  }

  return true;
}

export function parseContentType(contentType: any) {
  if (typeof contentType !== "string") return;
  if (!contentType) return;

  const [mime, ...params] = contentType.trim().split(";");

  return {
    type: mime?.trim(),
    params: params.reduce((acc: any, item: any) => {
      const splitted = item.split("=");
      const key = splitted[0].trim();
      const value = splitted[1].trim();
      acc[key] = value;
      return acc;
    }, {}),
  };
}

export function validateDataTypeName(dataType: any) {
  const notAllowedDataTypes = [
    "url",
    "method",
    "headers",
    "body",
    "baseUrl",

    "status",
    "statusText",
    "data",

    "params",
    "param",
    "queries",
    "query",

    "get",
    "post",
    "put",
    "delete",
    "patch",
    "head",

    "dataType",
    "responseDataType",

    "context",
    "ctx",
  ];

  if (notAllowedDataTypes.includes(dataType)) {
    return false;
  }
  return true;
}

// this method does not care about invalid accept header....
export function parseAccept(accept: any) {
  if (typeof accept !== "string") return [];

  const accepts = accept.split(",");
  const parsedAccepts: { type: string; params: Record<string, string> }[] = [];

  accepts.forEach((accept) => {
    const parts = accept.split(";");
    const types = parts[0]!.trim();
    const params = parts.slice(1);

    const paramsObject = params?.reduce(
      (acc, param) => {
        const keyValue = param.split("=");
        const key = keyValue[0]?.trim();
        const value = keyValue[1]?.trim();

        if (key && value) acc[key] = value;
        return acc;
      },
      { q: "1" } as { [key: string]: string },
    );

    const [mime, subMime] = types?.split("/");
    const subMimes = subMime?.split("+");

    subMimes?.forEach((item: string) => {
      parsedAccepts.push({
        type: `${mime}/${item}`,
        params: paramsObject,
      });
    });
  });

  return parsedAccepts;
}

export function sortAcceptByQFactor(
  accepts: { type: string; params: Record<string, string> }[],
) {
  return accepts.sort((a, b) => {
    const aQ = Number(a.params.q ?? "1");
    const bQ = Number(b.params.q ?? "1");

    if (aQ === bQ) {
      return 0;
    }

    return aQ > bQ ? -1 : 1;
  });
}
