import { NextResponse } from 'next/server';
import { meeraSystemPrompt } from '@/lib/prompt';

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

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
          modalities: ['audio', 'text'],
          // **Replace the old instructions with our natural‐language prompt**
          instructions: meeraSystemPrompt,
          tool_choice: 'auto',
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Session creation failed: ${response.status} – ${text}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating realtime session:', error);
    return NextResponse.json(
      { error: 'Failed to create realtime session' },
      { status: 500 }
    );
  }
}
