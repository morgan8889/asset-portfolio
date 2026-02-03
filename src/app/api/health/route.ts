import { NextResponse } from 'next/server';

/**
 * Health check endpoint for container orchestration and monitoring.
 * Returns 200 OK if the application is running and healthy.
 *
 * Used by:
 * - Docker HEALTHCHECK instruction
 * - Kubernetes liveness/readiness probes
 * - Load balancers
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
