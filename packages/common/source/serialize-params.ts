export function serializeSearchParams(searchParams: Record<string, any[]>) {
  const result: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    const newValue: any[] = [];
    value.forEach((item) => {
      if (item instanceof Date) newValue.push(item.toISOString());
      else newValue.push(String(item));
    });

    result[key] = newValue;

    // if (value instanceof Date) result[key] = value.map((v) => v.toISOString());
    // else result[key] = value.map(String);
  }

  return result;
}

export function serializeParams(params: Record<string, any>) {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value instanceof Date) result[key] = value.toISOString();
    else result[key] = String(value);
  }

  return result;
}
