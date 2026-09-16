/**
 * Interfaz agnóstica de proveedor de pago — mismo criterio que
 * `@kor/ai-gateway` para IA (ver README): el dominio de checkout nunca
 * llama a un SDK de pago directo, siempre pasa por acá. Hoy la única
 * implementación es `MockPaymentProvider`; el conector real de Mercado
 * Pago Marketplace se suma cuando haya credenciales de sandbox, sin
 * tocar `orders.service.ts`.
 */
export interface CreatePaymentInput {
  orderId: string;
  amountCents: number;
  currency: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  status: "pending" | "approved" | "rejected";
  /** URL a la que se redirige al comprador para completar el pago (checkout hosteado). */
  checkoutUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
}

/**
 * Simula un checkout hosteado sin tocar dinero real: el pago queda "pending"
 * y se resuelve llamando `POST /payments/:id/resolve` (ver routes.ts), que
 * hace las veces de webhook del proveedor. `checkoutUrl` apunta a una ruta
 * propia de la API en vez de a Mercado Pago.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      providerPaymentId: `mock_${input.orderId}`,
      status: "pending",
      checkoutUrl: `/api/v1/payments/mock-checkout/${input.orderId}`,
    };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
