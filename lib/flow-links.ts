type FlowParamValue = string | number | boolean | null | undefined;

export function buildFlowHref(path: string, params: Record<string, FlowParamValue>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function compactContext(parts: Array<string | string[] | number | null | undefined>) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string | number => part !== null && part !== undefined && part !== "")
    .map(String)
    .join("\n");
}
