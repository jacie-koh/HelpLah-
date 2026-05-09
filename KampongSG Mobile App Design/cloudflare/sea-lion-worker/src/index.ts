export interface Env {
  AI: Ai;
  SEALION_API_KEY?: string;
}

const MODEL = '@cf/aisingapore/gemma-sea-lion-v4-27b-it';
const STT_MODEL = '@cf/openai/whisper';
const TTS_MODEL = '@cf/myshell-ai/melotts';

const ttsLanguageMap: Record<string, string> = {
  'en-sg': 'en',
  'zh-sg': 'zh',
  'zh-min': 'zh',
  'zh-yue': 'zh',
  'ms-sg': 'ms',
  'ta-sg': 'ta'
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...init.headers
    }
  });
}

function getMessages(body: { messages?: Array<{ role: string; content: string }>; system?: string; prompt?: string }) {
  if (Array.isArray(body.messages)) return body.messages;
  if (!body.prompt) return null;

  const messages: Array<{ role: string; content: string }> = [];
  if (body.system) messages.push({ role: 'system', content: body.system });
  messages.push({ role: 'user', content: body.prompt });
  return messages;
}

function base64ToBytes(base64: string) {
  const cleanBase64 = base64.includes(',') ? base64.split(',').pop()! : base64;
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function isAuthorized(request: Request, env: Env) {
  if (!env.SEALION_API_KEY) return true;
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  return token === env.SEALION_API_KEY;
}

function createTextStreamTransformer(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const text = parsed.response || parsed.choices?.[0]?.delta?.content;
          if (typeof text === 'string' && text) controller.enqueue(encoder.encode(text));
        } catch {
          // Ignore malformed stream chunks.
        }
      }
    }
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const baseUrl = url.origin;

    if (url.pathname === '/') {
      return new Response(
        [
          'HelpLah SEA-LION Worker is ready.',
          '',
          `API Base URL: ${baseUrl}`,
        'POST /chat with { "prompt": "..." } or { "messages": [...] }',
        'POST /stream with the same body for plain text streaming.',
        'POST /stt with { "audioBase64": "..." } for speech-to-text.',
        'POST /tts with { "text": "...", "language": "en-sg" } for text-to-speech.',
        '',
        'Set this in Supabase as CLOUDFLARE_SEA_LION_API_BASE.'
        ].join('\n'),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            ...corsHeaders
          }
        }
      );
    }

    if (url.pathname === '/health') {
      return json({
        status: 'ok',
        models: {
          seaLion: MODEL,
          stt: STT_MODEL,
          tts: TTS_MODEL
        },
        endpoints: ['/chat', '/stream', '/stt', '/tts']
      });
    }

    if (!['/chat', '/stream', '/stt', '/tts'].includes(url.pathname)) {
      return json({ error: 'Not found', endpoints: ['/', '/health', '/chat', '/stream', '/stt', '/tts'] }, { status: 404 });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
    }

    if (!isAuthorized(request, env)) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { messages?: Array<{ role: string; content: string }>; system?: string; prompt?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (url.pathname === '/stt') {
      const audioBase64 = (body as { audioBase64?: string }).audioBase64;
      if (!audioBase64) return json({ error: "Request must include 'audioBase64'." }, { status: 400 });

      const audio = [...base64ToBytes(audioBase64)];
      const response = await env.AI.run(STT_MODEL, { audio });
      return json(response);
    }

    if (url.pathname === '/tts') {
      const ttsBody = body as { text?: string; language?: string; voice?: string };
      if (!ttsBody.text) return json({ error: "Request must include 'text'." }, { status: 400 });

      const response = await env.AI.run(TTS_MODEL, {
        prompt: ttsBody.text,
        lang: ttsLanguageMap[ttsBody.language || 'en-sg'] || 'en',
        voice: ttsBody.voice
      });

      if (response instanceof ReadableStream) {
        return new Response(response, {
          headers: {
            'Content-Type': 'audio/mpeg',
            ...corsHeaders
          }
        });
      }

      if (response instanceof ArrayBuffer) {
        return json({ audioBase64: bytesToBase64(response), mimeType: 'audio/mpeg' });
      }

      return json(response);
    }

    const messages = getMessages(body);
    if (!messages) {
      return json({ error: "Request must include either a 'messages' array or a 'prompt' string." }, { status: 400 });
    }

    if (url.pathname === '/chat') {
      const response = await env.AI.run(MODEL, { messages });
      return json(response);
    }

    const stream = await env.AI.run(MODEL, { messages, stream: true });
    return new Response((stream as ReadableStream).pipeThrough(createTextStreamTransformer()), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...corsHeaders
      }
    });
  }
} satisfies ExportedHandler<Env>;
