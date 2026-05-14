import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await query('SELECT 1');
    return NextResponse.json({ status: 'healthy', db: 'connected' });
  } catch (err) {
    return NextResponse.json(
      { status: 'unhealthy', db: 'disconnected', error: (err as Error).message },
      { status: 503 }
    );
  }
}
