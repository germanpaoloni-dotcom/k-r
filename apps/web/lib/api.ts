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
  onboardingCompletedAt: string | null;
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
const STORAGE_KEY = "gossip.session";

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

export function getSuggestedUsers() {
  return authRequest<(FollowUser & { bio: string | null })[]>("/users/suggested");
}

export function completeOnboarding(input: { lat?: number; lng?: number }) {
  return authRequest<UserPublic>("/users/me/onboarding", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
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
/* Gossip Pets                                                                  */
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

/* ---------------------------------------------------------------------- */
/* Subida de archivos (foto/video desde la PC o el celular)                */
/* ---------------------------------------------------------------------- */

export interface UploadResult {
  url: string;
  type: "image" | "video";
}

/** No pasa por `request()` a propósito: FormData necesita que el browser
 * ponga su propio Content-Type con boundary, nunca "application/json". */
export async function uploadFile(file: File): Promise<ApiEnvelope<UploadResult>> {
  const session = getSession();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/uploads`, {
    method: "POST",
    headers: session ? { Authorization: `Bearer ${session.accessToken}` } : {},
    body: form,
  });
  return (await res.json()) as ApiEnvelope<UploadResult>;
}

/* ---------------------------------------------------------------------- */
/* Mirá esto (capa efímera — desaparece a las 24hs por defecto)             */
/* ---------------------------------------------------------------------- */

export interface MiraEstoDto {
  id: string;
  contentType: "media" | "text" | "mixed";
  text: string | null;
  media: { id: string; type: string; url: string; thumbnailUrl: string | null } | null;
  intentEmoji: string | null;
  location: { id: string; name: string; city: string } | null;
  promotedToPostId: string | null;
  expiresAt: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  reactionCount: number;
  reactedByMe: boolean;
}

export function getMiraEstoFeed() {
  return authRequest<MiraEstoDto[]>("/mira-esto");
}

export function getMiraEstoById(id: string) {
  return authRequest<MiraEstoDto>(`/mira-esto/${id}`);
}

export function createMiraEsto(input: {
  contentType: "media" | "text" | "mixed";
  text?: string;
  media?: { type: "image" | "video"; url: string; thumbnailUrl?: string };
  locationId?: string;
  intentEmoji?: string;
  ttlHours?: number;
}) {
  return authRequest<MiraEstoDto>("/mira-esto", { method: "POST", body: JSON.stringify(input) });
}

export function deleteMiraEsto(id: string) {
  return authRequest<null>(`/mira-esto/${id}`, { method: "DELETE" });
}

/** El backend devuelve la fila cruda del post insertado (sin hidratar) —
 * alcanza para redirigir a /p/:id, que hace su propio fetch hidratado. */
export function promoteMiraEsto(id: string) {
  return authRequest<{ id: string }>(`/mira-esto/${id}/promote`, { method: "POST" });
}

export function reactToMiraEsto(id: string) {
  return authRequest<null>(`/mira-esto/${id}/react`, { method: "POST" });
}

export function unreactToMiraEsto(id: string) {
  return authRequest<null>(`/mira-esto/${id}/react`, { method: "DELETE" });
}

/* ---------------------------------------------------------------------- */
/* Mensajes (chat 1:1)                                                      */
/* ---------------------------------------------------------------------- */

export interface LastMessageDto {
  id: string;
  body: string | null;
  deleted: boolean;
  attachmentType: string | null;
  senderId: string;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  type: "direct" | "group";
  participants: FollowUser[];
  lastMessage: LastMessageDto | null;
  unreadCount: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  attachmentType: string | null;
  attachmentId: string | null;
  deleted: boolean;
  createdAt: string;
}

export function getConversations() {
  return authRequest<ConversationDto[]>("/conversations");
}

export function startConversation(userId: string) {
  return authRequest<{ id: string }>("/conversations", { method: "POST", body: JSON.stringify({ userId }) });
}

export function getMessages(conversationId: string) {
  return authRequest<MessageDto[]>(`/conversations/${conversationId}/messages`);
}

export function sendChatMessage(conversationId: string, body: string) {
  return authRequest<MessageDto>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function markConversationRead(conversationId: string) {
  return authRequest<null>(`/conversations/${conversationId}/read`, { method: "POST", body: "{}" });
}

/* ---------------------------------------------------------------------- */
/* Perfil propio y analytics de creador                                     */
/* ---------------------------------------------------------------------- */

export function updateProfile(input: { displayName?: string; bio?: string; avatarUrl?: string }) {
  return authRequest<UserPublic>("/users/me", { method: "PATCH", body: JSON.stringify(input) });
}

export interface CreatorAnalytics {
  postCount: number;
  totalLikes: number;
  totalComments: number;
  totalImpressions: number;
  topPosts: {
    id: string;
    caption: string | null;
    createdAt: string;
    likeCount: number;
    commentCount: number;
    impressions: number;
  }[];
}

export function getCreatorAnalytics() {
  return authRequest<CreatorAnalytics>("/analytics/creator");
}

/* ---------------------------------------------------------------------- */
/* Búsqueda                                                                  */
/* ---------------------------------------------------------------------- */

export interface SearchResults {
  users: { id: string; username: string; display_name: string; avatar_url: string | null }[];
  locations: { id: string; name: string; city: string; category: string | null }[];
  posts: { id: string; caption: string | null; username: string; display_name: string }[];
  decilo: { id: string; body: string; username: string; display_name: string }[];
}

export function search(q: string) {
  return request<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
}
