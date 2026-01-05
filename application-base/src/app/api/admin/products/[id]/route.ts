import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/modules/admin/utils/permission-utils';
import { SYSTEM_PERMISSIONS } from '@/modules/admin/types';
import { prisma } from '@/lib/prisma/connection';
import { UpdateProductSchema } from '@/lib/validations/product';
import { z } from 'zod';

type RouteContext = {
  params: {
    id: string;
  };
};

// GET /api/admin/products/[id]
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const canReadProduct = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_READ);
    if (!canReadProduct) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
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
    console.error(`Error fetching product ${params.id}:`, error);
    return NextResponse.json({ error: 'Could not fetch product' }, { status: 500 });
  }
}

// PUT /api/admin/products/[id]
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
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

    const { name, description, isActive, variants } = validationResult.data;

    // For simplicity in this MVP, we only handle updates to the product's top-level fields.
    // A full implementation would handle creating, updating, and deleting variants and images.
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        description,
        isActive,
      },
      include: {
        variants: { include: { images: true } },
      },
    });

    return NextResponse.json(updatedProduct);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 });
    }
    console.error(`Error updating product ${params.id}:`, error);
    return NextResponse.json({ error: 'Could not update product' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const canDeleteProduct = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_DELETE);
        if (!canDeleteProduct) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.product.delete({
            where: { id: params.id },
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        // Handle case where product is not found
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        console.error(`Error deleting product ${params.id}:`, error);
        return NextResponse.json({ error: 'Could not delete product' }, { status: 500 });
    }
}
