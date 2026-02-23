import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI not configured. Add OPENAI_API_KEY to .env.local' },
      { status: 503 }
    );
  }

  try {
    const { messages } = await req.json();

    // Scaffold: ready for Vercel AI SDK or direct OpenAI integration
    // For now, return a placeholder response
    return NextResponse.json({
      message:
        'Jarvis AI is scaffolded and ready. Configure your AI provider in this route to enable full functionality.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
