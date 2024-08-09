export function getDataType(dataTypes: Record<string, string>) {
  return (acceptOrContentTypeHeader?: string) => {
    if (!acceptOrContentTypeHeader) return;

    const mime = acceptOrContentTypeHeader.trim().split(";")[0];
    if (!mime) return;
    // const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    // if(mimeRegex.test(mime)) return;

    for (const [key, value] of Object.entries(dataTypes)) {
      if (value == mime) {
        return key;
      }
    }
  };
}

export function extractContentTypeHeader(contentType?: string) {
  const info: Record<string, string | undefined> = {
    charset: undefined,
    boundary: undefined,
    mediaType: undefined,
  };
  if (!contentType) return info;

  const splitted = contentType.trim().split(";");

  info["mediaType"] = splitted[0];

  for (const item of splitted.slice(1)) {
    const [key, value] = item.trim().split("=");
    if (key) {
      info[key] = value;
    }
  }

  return info;
}

export function getContentTypeHeader(dataTypes: Record<string, string>) {
  return (dataType?: string) => {
    if (!dataType) return;
    if (!(dataType in dataTypes)) return;

    const mime = dataTypes[dataType]?.trim().toLowerCase();

    if (!mime) return;
    const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    if (!mimeRegex.test(mime)) return;

    // const [mimeType] = mime.split("/");

    // if (mimeType?.includes("multipart")) {
    //   return boundary ? `${mime};boundary=${boundary}` : undefined;
    // }

    return mime;
  };
}

export function getAcceptHeader(dataTypes: Record<string, string>) {
  return (dataType?: string) => {
    if (!dataType) return;
    if (!(dataType in dataTypes)) return;

    const mime = dataTypes[dataType]?.trim().toLowerCase();

    if (!mime) return;
    const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    if (!mimeRegex.test(mime)) return;

    return mime;
  };
}
