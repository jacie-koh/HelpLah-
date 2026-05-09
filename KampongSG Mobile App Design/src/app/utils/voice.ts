import { publicAnonKey } from '../../../utils/supabase/info.tsx';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';

const API_BASE = supabaseFunctionsApiBase;

const speechLanguageMap = {
  'en-sg': 'en-SG',
  'zh-sg': 'zh-CN',
  'zh-min': 'nan-SG',
  'zh-yue': 'yue-HK',
  'ms-sg': 'ms-MY',
  'ta-sg': 'ta-IN'
};

function getSpeechLanguage(language: string) {
  return speechLanguageMap[language] || speechLanguageMap['en-sg'];
}

async function getBrowserVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) return voices;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeout = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

async function playBrowserSpeech(text: string, language: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    alert(text);
    return false;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechLanguage(language);
  utterance.rate = 0.9;
  const voices = await getBrowserVoices();
  const targetLang = utterance.lang.toLowerCase();
  const targetBase = targetLang.split('-')[0];
  const matchingVoice = voices.find((voice) => voice.lang.toLowerCase() === targetLang)
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(`${targetBase}-`));
  if (matchingVoice) utterance.voice = matchingVoice;

  window.speechSynthesis.speak(utterance);
  return true;
}

export async function speakText(text: string, language: string, accessToken?: string) {
  if (!text.trim()) return false;

  // Keep TTS in the user gesture path. The remote Cloudflare audio route can 502 on model/provider
  // issues, while browser speech gives reliable local read-aloud for every speaker icon.
  return playBrowserSpeech(text, language);
}

export async function transcribeAudioBlob(blob: Blob, language: string, accessToken?: string) {
  if (!accessToken) return null;

  const audioBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const response = await fetch(`${API_BASE}/ai/stt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      apikey: publicAnonKey
    },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      language
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.text || null;
}

export async function recordSpeechToText(language: string, accessToken?: string, durationMs = 3500) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  try {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
    });

    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, durationMs);

    const audioBlob = await recordingDone;
    return transcribeAudioBlob(audioBlob, language, accessToken);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
