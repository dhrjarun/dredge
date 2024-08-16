export async function defaultJSONBodyParser(options: any) {
  const payload = await options.text();
  if (!payload) return;
  return JSON.parse(payload);
}

export function defaultJsonDataSerializer(options: any) {
  const data = options.data;
  return JSON.stringify(data);
}

export function defaultTextDataSerializer(options: any) {
  const data = options.data;
  if (typeof data === "string") return data;
  return "";
}

export async function defaultTextBodyParser(options: any) {
  const payload = await options.text();
  if (!payload) return;
  return payload;
}
