import { z } from "zod";

/* ---------------------------------------------------------------------- */
/* Enums compartidos                                                       */
/* ---------------------------------------------------------------------- */

export const ACCOUNT_TYPES = ["personal", "creator", "business", "organizer"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PRIVACY_MODES = ["public", "private"] as const;
export type PrivacyMode = (typeof PRIVACY_MODES)[number];

export const POST_VISIBILITY = ["public", "followers", "private"] as const;
export type PostVisibility = (typeof POST_VISIBILITY)[number];

export const EVENT_ATTENDANCE_STATUS = ["interested", "going", "reminder_set"] as const;
export type EventAttendanceStatus = (typeof EVENT_ATTENDANCE_STATUS)[number];

// Estados de una orden del marketplace (checkout + comisión por venta, decidido en Fase 0).
export const ORDER_STATUS = [
  "pending_payment",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

// Un Payment representa el intento/registro de cobro (vía Mercado Pago Marketplace).
export const PAYMENT_STATUS = ["pending", "approved", "rejected", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

// Un Payout es la liquidación al negocio (venta - comisión de la plataforma).
export const PAYOUT_STATUS = ["pending", "processing", "paid", "failed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUS)[number];

/* ---------------------------------------------------------------------- */
/* Auth                                                                     */
/* ---------------------------------------------------------------------- */

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_.]+$/i, "Solo letras, números, punto y guión bajo"),
  displayName: z.string().min(1).max(60),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

/* ---------------------------------------------------------------------- */
/* Entidades — reflejan el schema de DB (apps/api/src/db/schema.ts)        */
/* ---------------------------------------------------------------------- */

export interface UserPublic {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  accountType: AccountType;
  createdAt: string;
}

export interface UserPrivate extends UserPublic {
  email: string;
  privacyMode: PrivacyMode;
}

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  city: string;
  category: string | null;
}

export interface Business {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  category: string;
  locationId: string | null;
  whatsapp: string | null;
  verified: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  stock: number;
  images: string[];
  category: string | null;
}

export interface Order {
  id: string;
  buyerUserId: string;
  businessId: string;
  status: OrderStatus;
  subtotalCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: "mercadopago";
  providerPaymentId: string | null;
  status: PaymentStatus;
  amountCents: number;
  createdAt: string;
}

export interface Payout {
  id: string;
  businessId: string;
  orderId: string;
  status: PayoutStatus;
  amountCents: number;
  scheduledAt: string | null;
  paidAt: string | null;
}

export interface EventEntity {
  id: string;
  organizerId: string;
  businessId: string | null;
  title: string;
  description: string | null;
  coverUrl: string | null;
  locationId: string;
  startsAt: string;
  endsAt: string | null;
  priceCents: number | null;
  category: string | null;
}
