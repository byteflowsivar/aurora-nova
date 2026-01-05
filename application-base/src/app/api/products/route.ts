import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/connection';

// GET /api/products - Public endpoint to list active products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: { isActive: true },
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
      prisma.product.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      data: products,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching public products:', error);
    return NextResponse.json({ error: 'Could not fetch products' }, { status: 500 });
  }
}
