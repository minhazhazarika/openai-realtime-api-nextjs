import { NextResponse } from 'next/server';
import { meeraSystemPrompt } from '@/lib/prompt';

// In-memory store (resets when the function cold-boots, but good enough for an MVP)
const sessionStore: Record<string, { role: string; content: string }[]> = {};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { sessionId, userText } = await req.json();

    // Pull or initialize memory for this session
    const memory = sessionStore[sessionId] || [];

    // Build the messages array: system → memory → user
    const messages = [
      { role: 'system', content: meeraSystemPrompt },
      ...memory,
      { role: 'user',   content: userText }
    ];

    // Create the realtime session
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
          instructions: JSON.stringify({ messages }), // embed full chat context
          tool_choice: 'auto',
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Session creation failed: ${response.status} – ${text}`);
    }

    const data = await response.json();

    // --- Update memory: push user + assistant then trim to last 10 ---
    const aiReply = data.initial_message?.content ?? '';
    memory.push(
      { role: 'user',      content: userText },
      { role: 'assistant', content: aiReply }
    );
    sessionStore[sessionId] = memory.slice(-10);

    // Return the session data plus the sessionId so the client can keep using it
    return NextResponse.json({ ...data, sessionId });
  } catch (err) {
    console.error('Error in session route:', err);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
