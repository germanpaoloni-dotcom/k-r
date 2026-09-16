const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiEnvelope<T> {
  data: T | null;
  error: { message?: string } | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      // Fastify rechaza un body vacío con este header puesto — solo va cuando hay body.
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 204) return { data: null, error: null };
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

/** Igual que `request`, pero agrega el Bearer de la sesión activa (si hay). */
function authRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const session = getSession();
  return request<T>(path, {
    ...init,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

/* ---------------------------------------------------------------------- */
/* Posts / feed                                                             */
/* ---------------------------------------------------------------------- */

export interface PostDto {
  id: string;
  caption: string | null;
  visibility: string;
  kind: string;
  medium: string | null;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  location: { id: string; name: string; city: string } | null;
  media: { id: string; type: string; url: string; thumbnailUrl: string | null }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  reasonWhySeeing?: string;
}

export type FeedTab = "for-you" | "following" | "nearby" | "trending" | "mi-gente";

export function getFeed(
  tab: FeedTab,
  opts: { lat?: number; lng?: number } = {}
): Promise<ApiEnvelope<PostDto[]>> {
  switch (tab) {
    case "for-you":
      return authRequest<PostDto[]>("/feed/for-you");
    case "following":
      return authRequest<PostDto[]>("/feed/following");
    case "trending":
      return authRequest<PostDto[]>("/feed/trending");
    case "mi-gente":
      return authRequest<PostDto[]>("/feed/mi-gente");
    case "nearby": {
      if (opts.lat === undefined || opts.lng === undefined) {
        return Promise.resolve({ data: [], error: { message: "Falta la ubicación." } });
      }
      return authRequest<PostDto[]>(`/feed/nearby?lat=${opts.lat}&lng=${opts.lng}`);
    }
  }
}

export function dismissFromForYou(postId: string) {
  return authRequest<null>(`/feed/for-you/${postId}/dismiss`, { method: "POST" });
}

export function getPost(id: string) {
  return authRequest<PostDto>(`/posts/${id}`);
}

export function createPost(input: {
  caption?: string;
  locationId?: string;
  visibility?: "public" | "followers" | "private";
  media: { type: "image" | "video"; url: string }[];
}) {
  return authRequest<PostDto>("/posts", { method: "POST", body: JSON.stringify(input) });
}

export function likePost(id: string) {
  return authRequest<null>(`/posts/${id}/like`, { method: "POST" });
}

export function unlikePost(id: string) {
  return authRequest<null>(`/posts/${id}/like`, { method: "DELETE" });
}

export function savePost(id: string) {
  return authRequest<null>(`/posts/${id}/save`, { method: "POST" });
}

export function unsavePost(id: string) {
  return authRequest<null>(`/posts/${id}/save`, { method: "DELETE" });
}

export interface CommentDto {
  id: string;
  body: string;
  parentCommentId: string | null;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

export function getComments(postId: string) {
  return request<CommentDto[]>(`/posts/${postId}/comments`);
}

export function addComment(postId: string, body: string) {
  return authRequest<CommentDto>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/* ---------------------------------------------------------------------- */
/* Usuarios / follow                                                        */
/* ---------------------------------------------------------------------- */

export function getUser(id: string) {
  return request<UserPublic>(`/users/${id}`);
}

export function getUserPosts(id: string) {
  return authRequest<PostDto[]>(`/users/${id}/posts`);
}

export interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export function getFollowers(id: string) {
  return request<FollowUser[]>(`/users/${id}/followers`);
}

export function getFollowing(id: string) {
  return request<FollowUser[]>(`/users/${id}/following`);
}

export function followUser(id: string) {
  return authRequest<null>(`/users/${id}/follow`, { method: "POST" });
}

export function unfollowUser(id: string) {
  return authRequest<null>(`/users/${id}/follow`, { method: "DELETE" });
}

/* ---------------------------------------------------------------------- */
/* Lugares (para el tag de ubicación al crear un post)                     */
/* ---------------------------------------------------------------------- */

export interface LocationDto {
  id: string;
  name: string;
  city: string;
  category: string | null;
}

export function searchLocations(q: string) {
  return request<LocationDto[]>(`/locations?q=${encodeURIComponent(q)}&limit=8`);
}

/* ---------------------------------------------------------------------- */
/* Mi gente (amistad — distinto de follow)                                  */
/* ---------------------------------------------------------------------- */

export function getFriends() {
  return authRequest<FollowUser[]>("/friendships");
}

export function getFriendRequests() {
  return authRequest<{ incoming: { id: string; requester: FollowUser }[]; outgoing: { id: string; addressee: FollowUser }[] }>(
    "/friendships/requests"
  );
}

export function requestFriendship(userId: string) {
  return authRequest<null>(`/friendships/${userId}/request`, { method: "POST", body: "{}" });
}

/* ---------------------------------------------------------------------- */
/* Perfil ajeno — gente en común, estado de actividad                       */
/* ---------------------------------------------------------------------- */

export function getMutualFollowees(userId: string) {
  return authRequest<FollowUser[]>(`/users/${userId}/mutual`);
}

export function getActivityState(userId: string) {
  return request<{ state: string }>(`/users/${userId}/activity-state`);
}

/* ---------------------------------------------------------------------- */
/* Kör Pets                                                                  */
/* ---------------------------------------------------------------------- */

export interface PetDefinitionDto {
  id: string;
  key: string;
  name: string;
  species: string;
  personality: string;
  description: string | null;
  interaction: string;
  rarity: string;
}

export interface PetDto {
  id: string;
  ownerType: string;
  ownerId: string;
  species: string;
  name: string;
  definitionId: string | null;
  level: number;
  xp: number;
  createdAt: string;
  definition: PetDefinitionDto | null;
}

export function getPetDefinitions() {
  return request<PetDefinitionDto[]>("/pet-definitions");
}

export function getMyPet() {
  return authRequest<PetDto | null>("/pets/mine");
}

export function getUserPet(userId: string) {
  return request<PetDto | null>(`/users/${userId}/pet`);
}

export function adoptPet(definitionId: string) {
  return authRequest<PetDto>("/pets/adopt", { method: "POST", body: JSON.stringify({ definitionId }) });
}
