import { parseContentType } from "./data-types";

type MimeStoreInit<T = any> = MimeStore<T> | { [key: string]: T };

export class MimeStore<T> {
  map: Map<string, T> = new Map();

  private handleInit(item: MimeStoreInit<T>) {
    if (item instanceof MimeStore) {
      this.map = new Map([...this.map, ...item.map]);
    } else {
      Object.entries(item).forEach(([key, value]) => {
        this.set(key, value);
      });
    }
  }

  constructor(init?: MimeStoreInit<T> | MimeStoreInit<T>[]) {
    if (!init) return;

    if (Array.isArray(init)) {
      init.forEach((item) => {
        this.handleInit(item);
      });
    } else {
      this.handleInit(init);
    }
  }

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

  get(contentType: string): T | undefined {
    const ct = parseContentType(contentType.trim());
    const mediaType = ct?.type;
    if (!mediaType) return;

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
