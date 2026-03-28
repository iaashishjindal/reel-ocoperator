import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { videoUrl, caption } = await request.json();

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'PLACEHOLDER_MAKE_WEBHOOK_URL') {
      return NextResponse.json({ error: 'Make.com webhook not configured' }, { status: 503 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl, caption }),
    });

    if (!response.ok) {
      throw new Error(`Make.com responded with ${response.status}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Instagram post error:', error);
    return NextResponse.json({ error: 'Failed to trigger Instagram post' }, { status: 500 });
  }
}
