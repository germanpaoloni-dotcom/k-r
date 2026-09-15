const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiEnvelope<T> {
  data: T | null;
  error: { message?: string } | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return (await res.json()) as ApiEnvelope<T>;
}

export interface UserPublic {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  accountType: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function register(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}) {
  return request<{ user: UserPublic; tokens: AuthTokens }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return request<{ user: UserPublic; tokens: AuthTokens }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function me(accessToken: string) {
  return request<UserPublic>("/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/* Almacenamiento de sesión en el navegador — app real, no artifact:
   localStorage es válido acá (no confundir con la restricción de previews). */
const STORAGE_KEY = "kor.session";

export function saveSession(tokens: AuthTokens) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function getSession(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthTokens) : null;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
