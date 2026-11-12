export function componentPropertyInputType(value: string | number | boolean): "number" | "text" | "color" {
  if (typeof value === "number") return "number";
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? "color" : "text";
}
