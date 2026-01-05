import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/modules/admin/utils/permission-utils';
import { SYSTEM_PERMISSIONS } from '@/modules/admin/types';
import { prisma } from '@/lib/prisma/connection';
import { CreateBaseProductSchema } from '@/lib/validations/product';
import { z } from 'zod';

const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const canCreateProducts = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_CREATE);
    if (!canCreateProducts) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = CreateBaseProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }

    const { name, description, isActive } = validationResult.data;
    const productSlug = slugify(name);

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        slug: productSlug,
        isActive,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return NextResponse.json({ error: 'A product with this name already exists.' }, { status: 409 });
    }
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Could not create product' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const canListProducts = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_LIST);
    if (!canListProducts) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          variants: {
            include: {
              images: true,
            },
          },
        },
      }),
      prisma.product.count(),
    ]);

    return NextResponse.json({
      data: products,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Could not fetch products' }, { status: 500 });
  }
}
