import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Lightweight health-check endpoint used by load balancers, uptime monitors,
 * and smoke tests to confirm the application is running.
 *
 * Returns HTTP 200 with a JSON body:
 *   { status: 'ok', timestamp: '<ISO-8601>' }
 *
 * MAINT-03: Health check endpoint
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
