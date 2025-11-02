import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In a real-world scenario, you might want to check database connectivity
    // or other critical services here.
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
