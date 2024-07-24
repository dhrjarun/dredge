export class MimeStore<T> {
  map: Map<string, T> = new Map();

  constructor() {}

  clone(): MimeStore<T> {
    const store = new MimeStore<T>();
    store.map = new Map(this.map);
    return store;
  }

  set(mediaType: string | string[], payload: T) {
    if (Array.isArray(mediaType)) {
      for (const item of mediaType) {
        this.setSingle(item, payload);
      }
      return;
    }
    this.setSingle(mediaType, payload);
  }

  setSingle(mediaType: string, payload: T) {
    mediaType = mediaType.trim().toLowerCase();

    const mimeRegex = /([a-zA-Z\-]+|\*)\/([a-zA-z\-]+|\*)/g;

    if (!mimeRegex.test(mediaType)) {
      throw new Error(`Invalid MediaType: ${mediaType}`);
    }

    this.map.set(mediaType, payload);
  }

  get(mediaType: string): T | undefined {
    // const regex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    // if (!regex.test(mediaType)) {
    //   throw new Error(`Invalid MediaType: ${mediaType}`);
    // }

    mediaType = mediaType.trim().toLowerCase();

    let payload = this.map.get(mediaType);
    if (payload) return payload;

    const [mimeType, mimeSubType] = mediaType.split("/");

    if (mimeType === "*" || mimeSubType === "*") {
      throw new Error(`Invalid MediaType: ${mediaType}`);
    }

    payload = this.map.get(`${mimeType}/*`);
    if (payload) return payload;

    payload = this.map.get(`*/${mimeSubType}`);
    if (payload) return payload;

    return this.map.get(`*/*`);
  }
}
