import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/modules/admin/utils/permission-utils';
import { SYSTEM_PERMISSIONS } from '@/modules/admin/types';
import { prisma } from '@/lib/prisma/connection';
import { UpdateProductSchema } from '@/lib/validations/product';
import { z } from 'zod';


type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/admin/products/[id]
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    const { id } = await params;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const canReadProduct = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_READ);
    if (!canReadProduct) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        variants: {
          include: {
            images: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    const { id } = await params;
    console.error(`Error fetching product ${id}:`, error);
    return NextResponse.json({ error: 'Could not fetch product' }, { status: 500 });
  }
}

// PUT /api/admin/products/[id]
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    const { id: productId } = await params;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const canUpdateProduct = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_UPDATE);
    if (!canUpdateProduct) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = UpdateProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }

    const { name, description, isActive, variants: incomingVariants } = validationResult.data;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Update main product details
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          name,
          description,
          isActive,
        },
        include: {
          variants: {
            include: { images: true }
          }
        }
      });

      const existingVariants = product.variants;
      const variantsToKeepIds = new Set<string>();

      if (incomingVariants) {
        for (const incomingVariant of incomingVariants) {
          const { id: incomingVariantId, images: incomingImages, ...variantData } = incomingVariant;

          let currentVariant;
          if (incomingVariantId) {
            // Update existing variant
            currentVariant = await tx.productVariant.update({
              where: { id: incomingVariantId, productId: productId },
              data: {
                price: variantData.price,
                stock: variantData.stock,
                attributes: variantData.attributes,
              },
            });
            variantsToKeepIds.add(incomingVariantId);
          } else {
            // Create new variant
            const newSku = await generateSKU(product.name, variantData.attributes || {});
            currentVariant = await tx.productVariant.create({
              data: {
                productId: product.id,
                sku: newSku,
                price: variantData.price || 0,
                stock: variantData.stock || 0,
                attributes: variantData.attributes || {},
              },
            });
            // Initial inventory movement for new variant
            if (currentVariant.stock > 0) {
              await tx.inventoryMovement.create({
                data: {
                  variantId: currentVariant.id,
                  type: 'INITIAL_STOCK',
                  quantityChange: currentVariant.stock,
                  reason: 'New product variant created',
                },
              });
            }
          }

          // Handle images for the current variant
          if (incomingImages) {
            const existingImages = await tx.productImage.findMany({
              where: { variantId: currentVariant.id }
            });
            const imagesToKeepUrls = new Set<string>();

            for (const incomingImage of incomingImages) {
              // Image URL is unique for a product variant
              const existingImage = existingImages.find(img => img.url === incomingImage.finalUrl);

              if (existingImage) {
                // Update existing image (e.g., altText)
                await tx.productImage.update({
                  where: { id: existingImage.id },
                  data: { altText: incomingImage.altText },
                });
                imagesToKeepUrls.add(incomingImage.finalUrl);
              } else {
                // Create new image
                await tx.productImage.create({
                  data: {
                    url: incomingImage.finalUrl,
                    altText: incomingImage.altText,
                    productId: product.id,
                    variantId: currentVariant.id,
                  },
                });
                imagesToKeepUrls.add(incomingImage.finalUrl);
              }
            }
            // Delete removed images for this variant
            await tx.productImage.deleteMany({
              where: {
                variantId: currentVariant.id,
                url: { notIn: Array.from(imagesToKeepUrls) },
              },
            });
          }
        }
      }

      // Delete removed variants
      const variantIdsToDelete = existingVariants
        .filter(ev => !variantsToKeepIds.has(ev.id))
        .map(ev => ev.id);

      if (variantIdsToDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: variantIdsToDelete } },
        });
      }

      // Return the fully updated product with relations
      return tx.product.findUnique({
        where: { id: productId },
        include: {
          variants: {
            include: { images: true }
          }
        }
      });
    });

    return NextResponse.json(updatedProduct);

  } catch (error) {
    const { id: recordId } = await params;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 });
    }
    console.error(`Error updating product ${recordId}:`, error);
    return NextResponse.json({ error: 'Could not update product', details: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    const { id: recordId } = await params;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const canDeleteProduct = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_DELETE);
    if (!canDeleteProduct) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.product.delete({
      where: { id: recordId },
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const { id: recordId } = await params;
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    console.error(`Error deleting product ${recordId}:`, error);
    return NextResponse.json({ error: 'Could not delete product' }, { status: 500 });
  }
}
