// app/api/session/route.ts
import { NextResponse } from 'next/server';
import { meeraSystemPrompt } from '@/lib/prompt';

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Create a brand new realtime session with just the persona prompt
    const response = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'alloy',
          modalities: ['text'],
          instructions: meeraSystemPrompt,
          tool_choice: 'auto',
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Session API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('session route error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
