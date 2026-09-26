export class MemoryStore<T extends Record<string, unknown>> {
  readonly #values = new Map<string, T>();

  constructor(private readonly key: keyof T) {}

  put(value: T): T {
    this.#values.set(String(value[this.key]), value);
    return value;
  }

  get(id: string): T | undefined {
    return this.#values.get(id);
  }

  list(predicate: (value: T) => boolean = () => true): readonly T[] {
    return [...this.#values.values()].filter(predicate);
  }

  update(id: string, update: (value: T) => T): T {
    const current = this.get(id);

    if (!current) {
      throw new Error("not_found");
    }

    return this.put(update(current));
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
