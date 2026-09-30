/**
 * Validates tool arguments against the tool's own JSON inputSchema,
 * so the schema advertised in ListTools is the single source of truth.
 */

interface PropSchema {
  type?: string;
  enum?: readonly unknown[];
  items?: { type?: string };
}

export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, PropSchema>;
  required?: readonly string[];
}

const typeOf = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

/**
 * @returns normalized args (numeric strings coerced for number props, undefined props dropped) or a list of problems.
 */
export function validateArgs(
  schema: ToolInputSchema,
  raw: unknown,
): { ok: true; args: Record<string, unknown> } | { ok: false; errors: string[] } {
  if (raw !== undefined && typeOf(raw) !== 'object') {
    return { ok: false, errors: ['tham số phải là một object'] };
  }
  const input = (raw ?? {}) as Record<string, unknown>;
  const props = schema.properties ?? {};
  const errors: string[] = [];
  const args: Record<string, unknown> = {};

  for (const key of schema.required ?? []) {
    const v = input[key];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      errors.push(`thiếu "${key}"`);
    }
  }

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const prop = props[key];
    if (!prop) {
      errors.push(`tham số lạ "${key}" (hợp lệ: ${Object.keys(props).join(', ') || 'không có'})`);
      continue;
    }
    let v = value;
    if (prop.type === 'number' && typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) v = Number(v);
    if (prop.type && typeOf(v) !== prop.type) {
      errors.push(`"${key}" phải là ${prop.type} (nhận ${typeOf(v)})`);
      continue;
    }
    if (prop.type === 'array' && prop.items?.type && (v as unknown[]).some(x => typeOf(x) !== prop.items!.type)) {
      errors.push(`"${key}" phải là mảng ${prop.items.type}`);
      continue;
    }
    if (prop.enum && !prop.enum.includes(v)) {
      errors.push(`"${key}" phải là một trong: ${prop.enum.join(', ')}`);
      continue;
    }
    args[key] = v;
  }

  return errors.length ? { ok: false, errors } : { ok: true, args };
}
