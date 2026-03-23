import { ClientSession } from "@/types/blog";

const AUTH_STORAGE_KEY = "blog-system-session";
const AUTH_CHANGED_EVENT = "blog-system-auth-changed";

let cachedSessionRaw: string | null | undefined;
let cachedSessionParsed: ClientSession | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getClientSession(): ClientSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw === cachedSessionRaw) {
    return cachedSessionParsed;
  }

  cachedSessionRaw = raw;

  if (!raw) {
    cachedSessionParsed = null;
    return cachedSessionParsed;
  }

  try {
    const parsed = JSON.parse(raw) as ClientSession;
    if (
      !parsed ||
      typeof parsed.token !== "string" ||
      typeof parsed.user?.id !== "number" ||
      typeof parsed.user?.email !== "string"
    ) {
      cachedSessionParsed = null;
      return cachedSessionParsed;
    }
    cachedSessionParsed = parsed;
    return cachedSessionParsed;
  } catch {
    cachedSessionParsed = null;
    return cachedSessionParsed;
  }
}

export function saveClientSession(session: ClientSession): void {
  if (!canUseStorage()) {
    return;
  }
  const nextRaw = JSON.stringify(session);
  window.localStorage.setItem(AUTH_STORAGE_KEY, nextRaw);
  cachedSessionRaw = nextRaw;
  cachedSessionParsed = session;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearClientSession(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  cachedSessionRaw = null;
  cachedSessionParsed = null;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function subscribeClientSession(onStoreChange: () => void): () => void {
  if (!canUseStorage()) {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== AUTH_STORAGE_KEY) {
      return;
    }
    onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_CHANGED_EVENT, onStoreChange);
  };
}

export function getClientSessionServerSnapshot(): ClientSession | null {
  return null;
}

export function getAuthHeaders(token?: string): HeadersInit {
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}
