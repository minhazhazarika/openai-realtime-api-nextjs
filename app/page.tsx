/* app/page.tsx */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { OpenAI } from 'openai';
import { createRealtimeClient } from '@openai/realtime-client-fetch';

export default function Page() {
  const [transcript, setTranscript] = useState<string[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{ id: string; client_secret: string } | null>(null);
  const sessionRef = useRef<any>(null);

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch('/api/session', { method: 'POST' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setSessionInfo({ id: data.id, client_secret: data.client_secret });

        // setup realtime
        const client = new OpenAI({ apiKey: data.client_secret });
        const rtc = createRealtimeClient({ client });
        const session = await rtc.createSession({
          id: data.id,
          client_secret: data.client_secret,
        });

        session.on('response.created', async ({ response }) => {
          const msg = response.choices[0].message;
          if (msg.role !== 'assistant') return;

          const text = msg.content;
          setTranscript((t) => [...t, `Meera: ${text}`]);

          // call TTS
          try {
            const ttsRes = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
            });
            if (!ttsRes.ok) throw new Error(await ttsRes.text());

            const mp3 = await ttsRes.blob();
            const url = URL.createObjectURL(mp3);
            const audio = new Audio(url);
            await audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
          } catch (e) {
            console.error('TTS playback error', e);
          }
        });

        sessionRef.current = session;
      } catch (e) {
        console.error('Session init error', e);
      }
    }
    initSession();
  }, []);

  const handleStart = () => {
    if (sessionRef.current) sessionRef.current.start().catch(console.error);
  };
  const handleStop = () => {
    if (sessionRef.current) sessionRef.current.stop().catch(console.error);
  };

  return (
    <main className="p-4">
      <h1 className="text-2xl mb-4">Meera Voice Assistant</h1>
      <div className="mb-4">
        <button onClick={handleStart} className="px-4 py-2 bg-green-500 text-white rounded mr-2">
          Start
        </button>
        <button onClick={handleStop} className="px-4 py-2 bg-red-500 text-white rounded">
          Stop
        </button>
      </div>
      <div className="border p-4 h-64 overflow-auto bg-gray-50">
        {transcript.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    </main>
  );
}
