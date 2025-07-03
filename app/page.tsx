'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function Page() {
  const [transcript, setTranscript] = useState<string[]>([]);
  const wsRef = useRef<WebSocket>();
  const sessionIdRef = useRef<string>();
  const secretRef = useRef<string>();

  // 1) Start /api/session to get session ID + secret
  useEffect(() => {
    fetch('/api/session', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data: { id: string; client_secret: string }) => {
        sessionIdRef.current = data.id;
        secretRef.current    = data.client_secret;

        // 2) Open the realtime WebSocket
        const ws = new WebSocket(
          `wss://api.openai.com/v1/realtime/sessions/${data.id}` +
          `?client_secret=${encodeURIComponent(data.client_secret)}`
        );
        wsRef.current = ws;

        ws.onmessage = async (evt) => {
          const msg = JSON.parse(evt.data);
          // when GPT replies:
          if (msg.type === 'response.created') {
            const assistant = msg.response.choices[0].message;
            if (assistant.role !== 'assistant') return;

            const text = assistant.content;
            setTranscript(t => [...t, `Meera: ${text}`]);

            // 3) call ElevenLabs TTS
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
              console.error('TTS error', e);
            }
          }
        };

        ws.onerror = e => console.error('WebSocket error', e);
        ws.onclose = () => console.log('WebSocket closed');
      })
      .catch(console.error);
  }, []);

  // 4) Hook up Start/Stop buttons
  const handleStart = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'session.start' }));
  };
  const handleStop = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'session.stop' }));
  };

  return (
    <main className="p-4">
      <h1 className="text-2xl mb-4">Meera Voice Assistant</h1>
      <div className="mb-4">
        <button
          onClick={handleStart}
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Start
        </button>
        <button
          onClick={handleStop}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Stop
        </button>
      </div>
      <div className="border p-4 h-64 overflow-auto bg-gray-50">
        {transcript.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </main>
  );
}
