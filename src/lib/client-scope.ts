import { prisma } from "@/lib/prisma";
import type { SignedSessionPayload } from "@/lib/signed-tokens";

export interface ScopedCustomer {
  id: string;
  name: string;
  identification: string;
  phone: string;
  email: string | null;
  address: string | null;
  type: string;
  vip: boolean;
  notes: string | null;
  vehicles?: Array<{ id: string; plate: string; brand: string; model: string; year: number | null; color: string | null; mileage: number | null; fuelType: string | null; vehicleType: string | null }>;
}

/**
 * Resuelve el registro Customer asociado a la sesión verificada del cliente.
 */
export async function resolveSessionCustomerScope(
  session: SignedSessionPayload | null | undefined,
  includeVehicles = false
): Promise<ScopedCustomer | null> {
  if (!session) return null;
  const filters: any[] = [];
  if (session.email) {
    filters.push({ email: { equals: session.email.trim(), mode: "insensitive" } });
  }
  if (session.name) {
    filters.push({ name: { equals: session.name.trim(), mode: "insensitive" } });
  }
  if (filters.length === 0) return null;

  return (await prisma.customer.findFirst({
    where: { OR: filters },
    include: includeVehicles ? { vehicles: { orderBy: { createdAt: "desc" } } } : undefined,
  })) as ScopedCustomer | null;
}
