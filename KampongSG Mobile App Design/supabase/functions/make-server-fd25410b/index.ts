import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

const SEA_LION_MODEL = Deno.env.get('CLOUDFLARE_SEA_LION_MODEL') || '@cf/aisingapore/gemma-sea-lion-v4-27b-it';
const SEA_LION_API_BASE = Deno.env.get('CLOUDFLARE_SEA_LION_API_BASE') || Deno.env.get('SEA_LION_API_BASE');
const SEA_LION_API_KEY = Deno.env.get('CLOUDFLARE_SEA_LION_API_KEY') || Deno.env.get('SEA_LION_API_KEY');
const STT_MODEL = Deno.env.get('CLOUDFLARE_STT_MODEL') || '@cf/openai/whisper';
const TTS_MODEL = Deno.env.get('CLOUDFLARE_TTS_MODEL') || '@cf/myshell-ai/melotts';
const ttsLanguageMap: Record<string, string> = {
  'en-sg': 'en',
  'zh-sg': 'zh',
  'zh-min': 'zh',
  'zh-yue': 'zh',
  'ms-sg': 'ms',
  'ta-sg': 'ta'
};

function getCloudflareAiConfig() {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN') || Deno.env.get('CLOUDFLARE_AUTH_TOKEN');
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

async function runCloudflareAi(model: string, body: BodyInit, contentType: string) {
  const config = getCloudflareAiConfig();
  if (!config) {
    throw new Error('Cloudflare Workers AI is not configured');
  }

  return fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': contentType
    },
    body
  });
}

async function parseResponseJsonSafely(resp: Response) {
  const text = await resp.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { _nonJsonBody: text.slice(0, 500) } as Record<string, unknown>;
  }
}

async function runSeaLionChat(messages: Array<{ role: string; content: string }>) {
  if (SEA_LION_API_BASE) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (SEA_LION_API_KEY) {
      headers.Authorization = `Bearer ${SEA_LION_API_KEY}`;
    }

    const response = await fetch(`${SEA_LION_API_BASE.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages })
    });
    const data = await parseResponseJsonSafely(response);
    return { response, data };
  }

  const response = await runCloudflareAi(
    SEA_LION_MODEL,
    JSON.stringify({ messages }),
    'application/json'
  );
  const data = await parseResponseJsonSafely(response);
  return { response, data };
}

async function runSeaLionWorkerEndpoint(path: string, body: unknown) {
  if (!SEA_LION_API_BASE) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (SEA_LION_API_KEY) {
    headers.Authorization = `Bearer ${SEA_LION_API_KEY}`;
  }

  return fetch(`${SEA_LION_API_BASE.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

function coerceAiText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' && Number.isFinite(val)) return String(val);
  return '';
}

function choiceBlockText(entry: unknown): string {
  if (!entry || typeof entry !== 'object') return '';
  const e = entry as Record<string, unknown>;
  const msg = e.message;
  if (msg && typeof msg === 'object' && typeof (msg as Record<string, unknown>).content === 'string') {
    return (msg as { content: string }).content;
  }
  const delta = e.delta;
  if (delta && typeof delta === 'object' && typeof (delta as Record<string, unknown>).content === 'string') {
    return (delta as { content: string }).content;
  }
  const t = coerceAiText(e.text);
  return t;
}

/** Normalize Workers AI REST, Worker bindings, and mixed SDK payloads into plain text. */
function textFromWorkersAiResult(payload: any): string {
  if (payload == null) return '';

  if (typeof payload === 'string' && payload.trim()) return payload.trim();

  if (typeof payload === 'object' && !(payload instanceof ArrayBuffer)) {
    const p = payload as Record<string, unknown>;

    const top =
      coerceAiText(p.response)
      || coerceAiText(p.text)
      || choiceBlockText(Array.isArray(p.choices) ? p.choices[0] : null);
    if (top.trim()) return top.trim();

    const nested = p.result ?? p.data;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
    const r = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : null;

    if (r) {
      const mid =
        coerceAiText(r.response)
        || coerceAiText(r.text)
        || coerceAiText(r.generated_text)
        || coerceAiText(r.transcription)
        || choiceBlockText(Array.isArray(r.choices) ? r.choices[0] : null);
      if (mid.trim()) return mid.trim();
    }
  }

  return '';
}

/** Parses first JSON object or array from model text (models often wrap JSON in prose or markdown). */
function extractStructuredJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced || text).trim();

  const tryParse = (slice: string) => {
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  };

  const objStart = candidate.indexOf('{');
  const objEnd = candidate.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    const parsed = tryParse(candidate.slice(objStart, objEnd + 1));
    if (parsed && typeof parsed === 'object') return parsed;
  }

  const arrStart = candidate.indexOf('[');
  const arrEnd = candidate.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    const parsed = tryParse(candidate.slice(arrStart, arrEnd + 1));
    if (Array.isArray(parsed)) return parsed;
  }

  return null;
}

function stringFromTranslatedJsonValue(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function buildTranslationsFromStructuredPayload(structured: unknown, uniqueTexts: string[]) {
  if (Array.isArray(structured)) {
    return Object.fromEntries(
      uniqueTexts.map((source, index) => {
        const raw = structured[index];
        const s = stringFromTranslatedJsonValue(raw);
        return [source, s || '...'];
      })
    );
  }

  const obj =
    structured && typeof structured === 'object' && !Array.isArray(structured)
      ? (structured as Record<string, unknown>)
      : null;

  if (!obj) {
    return Object.fromEntries(uniqueTexts.map((text) => [text, '...']));
  }

  const tKeysSorted = Object.keys(obj)
    .filter((k) => /^t\d+$/i.test(k))
    .sort((a, b) => Number(a.replace(/^t/i, '')) - Number(b.replace(/^t/i, '')));

  return Object.fromEntries(
    uniqueTexts.map((source, index) => {
      let v = obj[`t${index}`] ?? obj[`T${index}`];
      if (typeof v !== 'string' || !stringFromTranslatedJsonValue(v)) {
        const keyAt = tKeysSorted[index];
        if (keyAt) v = obj[keyAt];
      }
      const s = stringFromTranslatedJsonValue(v);
      return [source, s || '...'];
    })
  );
}

function countNonPlaceholderTranslations(record: Record<string, string>): number {
  return Object.values(record).filter((v) => v && v !== '...').length;
}

function parseNumberedLineOutput(modelText: string, count: number): string[] {
  const byNum = new Map<number, string>();
  const lineRe = /^(\d+)\.\s*(.*)$/;
  for (const line of modelText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(lineRe);
    if (!m) continue;
    const idx = Number(m[1]);
    if (Number.isFinite(idx) && idx >= 1 && idx <= count) {
      byNum.set(idx, m[2].trim());
    }
  }
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const v = byNum.get(i);
    out.push(v && v.length > 0 ? v : '...');
  }
  return out;
}

async function translateWithNumberedLines(
  uniqueTexts: string[],
  targetLanguageDescription: string
): Promise<Record<string, string> | null> {
  const lines = uniqueTexts.map((text, idx) => `${idx + 1}. ${text.replace(/\r?\n/g, ' · ')}`);
  const prompt = [
    `Translate EACH numbered English line below into ${targetLanguageDescription}.`,
    'Rules:',
    '- Every output line MUST start with the same number and a dot (example: "2. 翻译后的文字").',
    '- Translate ONLY the phrase after each number.',
    `- Output exactly ${uniqueTexts.length} lines, numbered 1–${uniqueTexts.length}.`,
    '- No preamble, headings, bullets, Markdown, blank lines inside the list, or JSON.',
    '',
    lines.join('\n'),
  ].join('\n');

  const { response, data } = await runSeaLionChat([
    {
      role: 'system',
      content: 'You translate numbered UI lines. Preserve numbering strictly. Output numbered lines only.',
    },
    { role: 'user', content: prompt },
  ]);

  const modelText = textFromWorkersAiResult(data);
  if (!response.ok || data?.success === false || !modelText.trim()) return null;

  const parts = parseNumberedLineOutput(modelText, uniqueTexts.length);
  return Object.fromEntries(uniqueTexts.map((source, i) => [source, parts[i] || '...']));
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

app.get("/make-server-fd25410b/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/make-server-fd25410b/signup", async (c) => {
  try {
    const { email, password, name, role, phoneNumber, patientName, patientPhone } = await c.req.json();

    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields: email, password, name, role" }, 400);
    }

    if (!['patient', 'primary_caregiver', 'community_caregiver'].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create the caregiver account
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, phoneNumber },
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    const caregiverId = data.user.id;

    await kv.set(`user:${caregiverId}`, {
      id: caregiverId,
      email,
      name,
      role,
      phoneNumber,
      createdAt: new Date().toISOString()
    });

    // If primary caregiver, also create patient account
    let patientId = null;
    if (role === 'primary_caregiver' && patientName && patientPhone) {
      const patientEmail = `patient.${caregiverId}@kampongsg.auto`;
      const patientPassword = crypto.randomUUID();

      const { data: patientData, error: patientError } = await supabase.auth.admin.createUser({
        email: patientEmail,
        password: patientPassword,
        user_metadata: { name: patientName, role: 'patient', phoneNumber: patientPhone },
        email_confirm: true
      });

      if (!patientError && patientData) {
        patientId = patientData.user.id;

        await kv.set(`user:${patientId}`, {
          id: patientId,
          email: patientEmail,
          name: patientName,
          role: 'patient',
          phoneNumber: patientPhone,
          primaryCaregiverId: caregiverId,
          createdAt: new Date().toISOString()
        });

        // Link caregiver to patient
        await kv.set(`caregiver:${caregiverId}:patient`, patientId);

        console.log(`Patient created: ${patientEmail} linked to ${email}`);
      }
    }

    console.log(`User created: ${email} with role ${role}`);
    return c.json({ user: data.user, patientId });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: "Signup failed" }, 500);
  }
});

app.get("/make-server-fd25410b/profile", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const profile = await kv.get(`user:${user.id}`);
  return c.json({ profile });
});

app.post("/make-server-fd25410b/profile", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const updates = await c.req.json();
  const currentProfile = await kv.get(`user:${user.id}`);
  const updatedProfile = { ...currentProfile, ...updates, id: user.id, updatedAt: new Date().toISOString() };
  await kv.set(`user:${user.id}`, updatedProfile);
  return c.json({ profile: updatedProfile });
});

app.post("/make-server-fd25410b/tasks", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const task = await c.req.json();
  const taskId = task.id || crypto.randomUUID();
  await kv.set(`task:${taskId}`, { ...task, id: taskId, createdAt: task.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
  const patientTasks = await kv.get(`patient:${task.patientId}:tasks`) || [];
  if (!patientTasks.includes(taskId)) {
    patientTasks.push(taskId);
    await kv.set(`patient:${task.patientId}:tasks`, patientTasks);
  }
  return c.json({ taskId });
});

app.get("/make-server-fd25410b/patient/:patientId/tasks", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const patientId = c.req.param('patientId');
  const taskIds = await kv.get(`patient:${patientId}:tasks`) || [];
  const tasks = await Promise.all(taskIds.map(id => kv.get(`task:${id}`)));
  return c.json({ tasks: tasks.filter(t => t !== null) });
});

app.post("/make-server-fd25410b/tasks/:taskId/complete", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const taskId = c.req.param('taskId');
  const task = await kv.get(`task:${taskId}`);
  if (!task) return c.json({ error: "Task not found" }, 404);
  task.completedAt = new Date().toISOString();
  task.status = 'completed';
  await kv.set(`task:${taskId}`, task);
  return c.json({ success: true });
});

app.post("/make-server-fd25410b/voice-notes", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { patientId, transcription, audioUrl, summary } = await c.req.json();
  const noteId = crypto.randomUUID();
  await kv.set(`voicenote:${noteId}`, { id: noteId, patientId, transcription, audioUrl, summary, createdAt: new Date().toISOString() });
  const patientNotes = await kv.get(`patient:${patientId}:voicenotes`) || [];
  patientNotes.push(noteId);
  await kv.set(`patient:${patientId}:voicenotes`, patientNotes);
  return c.json({ noteId });
});

app.get("/make-server-fd25410b/patient/:patientId/voice-notes", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const patientId = c.req.param('patientId');
  const noteIds = await kv.get(`patient:${patientId}:voicenotes`) || [];
  const notes = await Promise.all(noteIds.map(id => kv.get(`voicenote:${id}`)));
  return c.json({ notes: notes.filter(n => n !== null) });
});

app.post("/make-server-fd25410b/location", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { latitude, longitude, address } = await c.req.json();
  await kv.set(`location:${user.id}`, { userId: user.id, latitude, longitude, address, updatedAt: new Date().toISOString() });
  return c.json({ success: true });
});

app.get("/make-server-fd25410b/location/:userId", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const userId = c.req.param('userId');
  const location = await kv.get(`location:${userId}`);
  return c.json({ location });
});

app.post("/make-server-fd25410b/assessment", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { caregiverId, patientId, score, answers } = await c.req.json();
  const assessmentId = crypto.randomUUID();
  await kv.set(`assessment:${assessmentId}`, { id: assessmentId, caregiverId, patientId, score, answers, createdAt: new Date().toISOString() });
  const caregiverAssessments = await kv.get(`caregiver:${caregiverId}:assessments`) || [];
  caregiverAssessments.push(assessmentId);
  await kv.set(`caregiver:${caregiverId}:assessments`, caregiverAssessments);
  await kv.set(`caregiver:${caregiverId}:latest-score`, score);
  return c.json({ assessmentId, score });
});

app.get("/make-server-fd25410b/caregiver/:caregiverId/latest-score", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const caregiverId = c.req.param('caregiverId');
  const score = await kv.get(`caregiver:${caregiverId}:latest-score`);
  return c.json({ score });
});

app.get("/make-server-fd25410b/caregiver/:caregiverId/patient", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const caregiverId = c.req.param('caregiverId');
  const patientId = await kv.get(`caregiver:${caregiverId}:patient`);
  return c.json({ patientId });
});

app.post("/make-server-fd25410b/vitals", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { patientId, type, value, unit } = await c.req.json();
  const vitalId = crypto.randomUUID();
  await kv.set(`vital:${vitalId}`, { id: vitalId, patientId, type, value, unit, recordedAt: new Date().toISOString() });
  const patientVitals = await kv.get(`patient:${patientId}:vitals`) || [];
  patientVitals.push(vitalId);
  await kv.set(`patient:${patientId}:vitals`, patientVitals);
  return c.json({ vitalId });
});

app.get("/make-server-fd25410b/patient/:patientId/vitals", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const patientId = c.req.param('patientId');
  const vitalIds = await kv.get(`patient:${patientId}:vitals`) || [];
  const vitals = await Promise.all(vitalIds.map(id => kv.get(`vital:${id}`)));
  return c.json({ vitals: vitals.filter(v => v !== null) });
});

app.post("/make-server-fd25410b/availability", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { caregiverId, available, patientId } = await c.req.json();
  await kv.set(`caregiver:${caregiverId}:availability`, { caregiverId, available, patientId, updatedAt: new Date().toISOString() });
  return c.json({ success: true });
});

app.get("/make-server-fd25410b/caregiver/:caregiverId/availability", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const caregiverId = c.req.param('caregiverId');
  const availability = await kv.get(`caregiver:${caregiverId}:availability`);
  return c.json({ availability });
});

app.post("/make-server-fd25410b/ai/sea-lion", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { prompt, messages, language = 'en-sg', system } = await c.req.json();
    const requestMessages = Array.isArray(messages)
      ? messages
      : [
          {
            role: 'system',
            content: system || `You are a Singapore care assistant. Reply in the user's selected language code: ${language}.`
          },
          { role: 'user', content: prompt || '' }
        ];

    const { response, data } = await runSeaLionChat(requestMessages);

    if (!response.ok || data?.success === false) {
      return c.json({ error: data?.errors?.[0]?.message || 'SEA-LION request failed' }, 502);
    }

    return c.json({
      text: textFromWorkersAiResult(data),
      model: SEA_LION_MODEL,
      provider: SEA_LION_API_BASE ? 'cloudflare-worker-api' : 'cloudflare-workers-ai'
    });
  } catch (error) {
    console.log(`SEA-LION error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-fd25410b/ai/translate", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { texts = [], language = 'en-sg' } = await c.req.json();
    const uniqueTexts = Array.from(new Set(
      (Array.isArray(texts) ? texts : [])
        .map((text) => String(text || '').trim())
        .filter(Boolean)
    )).slice(0, 80);

    if (language === 'en-sg' || uniqueTexts.length === 0) {
      return c.json({
        translations: Object.fromEntries(uniqueTexts.map((text) => [text, text])),
        model: SEA_LION_MODEL
      });
    }

    const numberedTexts = Object.fromEntries(uniqueTexts.map((text, index) => [`t${index}`, text]));
    const targetLanguageDescription = {
      'zh-sg': 'Singapore Mandarin Chinese',
      'zh-min': 'Singapore Hokkien written mainly with Chinese characters, not romanised dialect',
      'zh-yue': 'Cantonese written in traditional Chinese characters',
      'ms-sg': 'Singapore Malay',
      'ta-sg': 'Tamil'
    }[language] || language;

    const prompt = [
      `Translate every JSON value into ${targetLanguageDescription}.`,
      'Return ONLY a valid compact JSON object with the exact same keys.',
      'Do not include markdown, explanations, or extra keys.',
      'Preserve numbers, dates, times, phone numbers, URLs, and IDs.',
      'Localise common nouns, statuses, tasks, notification messages, addresses, and honorifics.',
      'For names, transliterate/localise common honorific words only when natural. Do not leave English unless it is an unavoidable proper noun.',
      'Input JSON:',
      JSON.stringify(numberedTexts)
    ].join('\n');

    const { response, data } = await runSeaLionChat([
      {
        role: 'system',
        content: 'You are a precise Singapore multilingual UI localisation engine.'
      },
      { role: 'user', content: prompt }
    ]);

    const modelText = textFromWorkersAiResult(data);
    if (
      !response.ok
      || data?.success === false
      || (typeof data?.error === 'string' && data.error && !modelText.trim())
    ) {
      const message = typeof data?.error === 'string' && data.error
        ? data.error
        : (data?.errors as Array<{ message?: string }> | undefined)?.[0]?.message;
      return c.json({ error: message || 'SEA-LION translation failed' }, 502);
    }

    const structured = extractStructuredJson(modelText);
    const translations = buildTranslationsFromStructuredPayload(structured, uniqueTexts);

    return c.json({
      translations,
      model: SEA_LION_MODEL,
      provider: SEA_LION_API_BASE ? 'cloudflare-worker-api' : 'cloudflare-workers-ai'
    });
  } catch (error) {
    console.log(`SEA-LION translation error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-fd25410b/ai/stt", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { audioBase64, mimeType = 'audio/webm', language = 'en-sg' } = await c.req.json();
    if (!audioBase64) return c.json({ error: "Missing audioBase64" }, 400);

    const response = await runSeaLionWorkerEndpoint('/stt', { audioBase64, mimeType, language })
      || await runCloudflareAi(STT_MODEL, base64ToBytes(audioBase64), mimeType);
    const data = await response.json();

    if (!response.ok || data?.success === false) {
      return c.json({ error: data?.errors?.[0]?.message || 'Speech-to-text request failed' }, 502);
    }

    return c.json({
      text: textFromWorkersAiResult(data),
      language,
      model: STT_MODEL,
      provider: SEA_LION_API_BASE ? 'cloudflare-worker-api' : 'cloudflare-workers-ai'
    });
  } catch (error) {
    console.log(`STT error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-fd25410b/ai/tts", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { text, language = 'en-sg', voice } = await c.req.json();
    if (!text) return c.json({ error: "Missing text" }, 400);

    const body = {
      prompt: text,
      lang: ttsLanguageMap[language] || 'en',
      voice
    };
    const response = await runSeaLionWorkerEndpoint('/tts', { text, language, voice })
      || await runCloudflareAi(TTS_MODEL, JSON.stringify(body), 'application/json');
    const contentType = response.headers.get('content-type') || 'audio/mpeg';

    if (!response.ok) {
      const errorPayload = contentType.includes('application/json') ? await response.json() : await response.text();
      return c.json({ error: errorPayload?.errors?.[0]?.message || 'Text-to-speech request failed' }, 502);
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      const audioBase64 = data?.result?.audio
        || data?.result?.audioBase64
        || data?.audio
        || data?.audioBase64;
      return c.json({
        audioBase64,
        mimeType: data?.result?.mimeType || data?.mimeType || 'audio/mpeg',
        model: TTS_MODEL,
        provider: 'cloudflare-workers-ai'
      });
    }

    const buffer = await response.arrayBuffer();
    return c.json({
      audioBase64: bytesToBase64(buffer),
      mimeType: contentType,
      model: TTS_MODEL,
      provider: 'cloudflare-workers-ai'
    });
  } catch (error) {
    console.log(`TTS error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-fd25410b/settings", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const settings = await c.req.json();
  await kv.set(`settings:${user.id}`, { ...settings, userId: user.id, updatedAt: new Date().toISOString() });
  return c.json({ success: true });
});

app.get("/make-server-fd25410b/settings", async (c) => {
  const user = await getAuthenticatedUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const settings = await kv.get(`settings:${user.id}`) || {
    language: 'en-sg',
    notifications: true,
    speechToText: true,
    textToSpeech: true,
    fontSize: 'Medium',
    emergencyContact: '',
    emergencyPhone: '',
    homeAddress: ''
  };
  return c.json({ settings });
});

Deno.serve(app.fetch);
