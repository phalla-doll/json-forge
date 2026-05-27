import yaml from "js-yaml";

export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversionError";
  }
}

export function parseJsonl(text: string, indent: number | string = 2): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new ConversionError("JSONL file is empty");
  }
  const items: unknown[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      items.push(JSON.parse(lines[i]));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ConversionError(`Line ${i + 1}: ${message}`);
    }
  }
  return JSON.stringify(items, null, indent);
}

export function parseYaml(text: string, indent: number | string = 2): string {
  if (!text.trim()) {
    throw new ConversionError("YAML input is empty");
  }
  let parsed: unknown;
  try {
    parsed = yaml.load(text, { schema: yaml.JSON_SCHEMA, json: true });
  } catch (e) {
    throw new ConversionError(
      e instanceof Error ? e.message : "Invalid YAML",
    );
  }
  if (parsed === undefined) {
    throw new ConversionError("YAML did not produce a value");
  }
  // js-yaml may return strings/numbers/booleans/null for scalar documents;
  // those round-trip as valid JSON, so we accept them.
  return JSON.stringify(parsed, null, indent);
}

export type ImportFormat = "json" | "jsonl" | "yaml";

export function detectFormat(filename: string): ImportFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".jsonl") || lower.endsWith(".ndjson")) return "jsonl";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";
  return null;
}
