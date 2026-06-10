export type Rule = (value: string) => string | undefined;
export type Chainable = Rule;

export function required(msg?: string): Rule {
  return (v) => !v || v.trim() === "" ? (msg ?? "This field is required") : undefined;
}

export function email(msg?: string): Rule {
  return (v) => {
    if (!v) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : (msg ?? "Invalid email address");
  };
}

export function minLength(n: number, msg?: string): Rule {
  return (v) => {
    if (!v) return undefined;
    return v.length < n ? (msg ?? `Must be at least ${n} characters`) : undefined;
  };
}

export function pattern(regex: RegExp, msg?: string): Rule {
  return (v) => {
    if (!v) return undefined;
    return regex.test(v) ? undefined : (msg ?? "Invalid format");
  };
}

export function pipe(...items: Chainable[]): Rule {
  return (v) => {
    for (const item of items) {
      const err = item(v);
      if (err !== undefined) return err;
    }
    return undefined;
  };
}

export const all = pipe;
