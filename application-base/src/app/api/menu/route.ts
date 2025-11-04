import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMenuForUser } from '@/lib/prisma/menu-queries';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const menu = await getMenuForUser(session.user.id);
    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
