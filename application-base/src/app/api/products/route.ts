import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/connection';

// GET /api/products - Public endpoint to list active products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const total = await prisma.product.count({ where: { isActive: true } });
    
    const productsWithDetails = await prisma.product.findMany({
      where: { isActive: true },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          orderBy: { price: 'asc' },
          include: { images: { orderBy: { order: 'asc' } } }
        }
      }
    });

    const simplifiedProducts = productsWithDetails.map(p => {
      const lowestPrice = p.variants[0]?.price;
      const mainImage = p.variants.flatMap(v => v.images)[0]?.url;
      
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: lowestPrice,
        imageUrl: mainImage,
      }
    });

    return NextResponse.json({
      data: simplifiedProducts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching public products:', error);
    return NextResponse.json({ error: 'Could not fetch products' }, { status: 500 });
  }
}
