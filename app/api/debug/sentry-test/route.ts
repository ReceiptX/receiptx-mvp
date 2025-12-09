import { NextResponse } from 'next/server';

export async function GET() {
  // Intentional crash to verify Sentry captures a 500 error and stacktrace
  // in the Next.js App Router API route.
  // Do not enable in production unless needed for debugging.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - deliberate undefined call
  myUndefinedFunction();
  return NextResponse.json({ ok: true });
}
