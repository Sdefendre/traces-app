import { NextResponse } from 'next/server';
import { extractErrorMessage } from '../../../../../shared/api-errors';

export async function POST(req: Request) {
  const body = await req.json();
  const { apiKey } = body as { apiKey?: string };

  const key = (apiKey && apiKey.trim()) || process.env.XAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'xAI API key is required' },
      { status: 400 }
    );
  }

  const res = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expires_after: { seconds: 300 } }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: extractErrorMessage(text) || res.statusText || 'xAI rejected the request' },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json({
    clientSecret: data.value ?? data.client_secret ?? '',
  });
}
