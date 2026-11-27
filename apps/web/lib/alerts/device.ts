const KEY = "kipita.device";

let memory: string | null = null;

export function deviceId(): string {
  if (memory) return memory;
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored && /^[0-9a-f-]{36}$/i.test(stored)) {
      memory = stored;
      return stored;
    }
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(KEY, fresh);
    memory = fresh;
    return fresh;
  } catch {
    memory = crypto.randomUUID();
    return memory;
  }
}
