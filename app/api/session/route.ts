// app/api/session/route.ts
import { NextResponse } from 'next/server';
import { meeraSystemPrompt } from '@/lib/prompt';

// In-memory store for up to 10 turns per session
const sessionStore: Record<string, { role: string; content: string }[]> = {};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { sessionId, userText } = await req.json();
    const memory = sessionStore[sessionId] || [];

    // Create the session, including persona + memory
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

          // 1) instructions must be a string
          instructions: meeraSystemPrompt,

          // 2) include prior turns as an array of {role,content}
          include: memory,

          tool_choice: 'auto',
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Session API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    // Save the very first assistant message (if present)
    const firstReply = data.initial_message?.content ?? '';
    memory.push(
      { role: 'user', content: userText },
      { role: 'assistant', content: firstReply }
    );
    sessionStore[sessionId] = memory.slice(-10);

    // Return the session info + sessionId so client can reuse
    return NextResponse.json({ ...data, sessionId });
  } catch (err: any) {
    console.error('Session route error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
