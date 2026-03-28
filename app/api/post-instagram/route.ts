import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { videoUrl, caption } = await request.json();

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'PLACEHOLDER_MAKE_WEBHOOK_URL') {
      return NextResponse.json({ error: 'Make.com webhook not configured' }, { status: 503 });
    }

    console.log(`[post-instagram] Sending to Make.com — videoUrl: ${videoUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl, caption }),
    });

    const makeStatus = response.status;
    const makeBody = await response.text();
    const durationMs = Date.now() - startTime;

    console.log(`[post-instagram] Make.com responded — status: ${makeStatus}, body: ${makeBody}, duration: ${durationMs}ms`);

    if (!response.ok) {
      return NextResponse.json({
        error: `Make.com returned HTTP ${makeStatus}`,
        makeStatus,
        makeBody,
        durationMs,
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      makeStatus,
      makeBody,
      videoUrl,
      durationMs,
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('[post-instagram] Error:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to trigger Instagram post',
      durationMs,
    }, { status: 500 });
  }
}
