import { prisma } from '@/lib/prisma/connection';

/**
 * Genera un SKU (Stock Keeping Unit) único para una variante de producto.
 *
 * El SKU se construye a partir del nombre del producto y sus atributos.
 * Si el SKU base ya existe, se le añade un sufijo numérico incremental
 * hasta encontrar uno que no esté en uso.
 *
 * @param productName - El nombre del producto.
 * @param attributes - Un objeto de atributos de la variante (ej. { color: 'Black', size: 'M' }).
 * @returns Una promesa que se resuelve con un SKU único.
 *
 * @example
 * // productName = 'Camiseta con Logo', attributes = { color: 'Black', size: 'M' }
 * // Devuelve algo como: CAM-BLA-M
 *
 * // Si 'CAM-BLA-M' ya existe, devolverá 'CAM-BLA-M-1', y así sucesivamente.
 * const sku = await generateSKU('Camiseta con Logo', { color: 'Black', size: 'M' });
 */
export async function generateSKU(
  productName: string,
  attributes: Record<string, string>
): Promise<string> {
  // 1. Construir el SKU base
  const namePart = productName.substring(0, 3).toUpperCase();
  const attributeParts = Object.values(attributes)
    .slice(0, 2) // Tomar los primeros 2 atributos
    .map(val => val.substring(0, 3).toUpperCase())
    .join('-');

  const baseSku = [namePart, attributeParts].filter(Boolean).join('-');

  if (!baseSku) {
    // Fallback por si no hay datos suficientes
    return `SKU-${Date.now()}`;
  }

  // 2. Verificar unicidad y añadir sufijo si es necesario
  let finalSku = baseSku;
  let counter = 1;

  while (true) {
    const existingVariant = await prisma.productVariant.findUnique({
      where: { sku: finalSku },
    });

    if (!existingVariant) {
      // El SKU es único, podemos usarlo
      break;
    }

    // El SKU ya existe, intentamos con un sufijo numérico
    finalSku = `${baseSku}-${counter}`;
    counter++;
  }

  return finalSku;
}
