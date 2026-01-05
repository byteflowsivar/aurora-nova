import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/connection';

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

// GET /api/products/[slug] - Public endpoint for a single product
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const product = await prisma.product.findUnique({
      where: { 
        slug: slug,
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
    const { slug } = await params; // Re-unwrap for logging in catch block
    console.error(`Error fetching product ${slug}:`, error);
    return NextResponse.json({ error: 'Could not fetch product' }, { status: 500 });
  }
}
