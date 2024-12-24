export function serializeParams(params: Record<string, any | any[]>) {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      const newValue: any[] = [];

      value.forEach((item) => {
        if (item instanceof Date) newValue.push(item.toISOString());
        else newValue.push(String(item));
      });

      result[key] = newValue;
      continue;
    }

    if (value instanceof Date) result[key] = value.toISOString();
    else result[key] = String(value);
  }

  return result;
}
