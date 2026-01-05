import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/connection';

type RouteContext = {
  params: {
    slug: string;
  };
};

// GET /api/products/[slug] - Public endpoint for a single product
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const product = await prisma.product.findUnique({
      where: { 
        slug: params.slug,
        isActive: true,
      },
      include: {
        variants: {
          orderBy: {
            attributes: 'asc', // Or any other logic to sort variants
          },
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
    console.error(`Error fetching product ${params.slug}:`, error);
    return NextResponse.json({ error: 'Could not fetch product' }, { status: 500 });
  }
}
