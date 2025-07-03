import { NextResponse } from 'next/server';
import { meeraSystemPrompt } from '@/lib/prompt';

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(`OPENAI_API_KEY is not set`);
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
          instructions: meeraSystemPrompt,
          tool_choice: 'auto',
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed: ${response.status} – ${text}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching session data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session data' },
      { status: 500 }
    );
  }
}
