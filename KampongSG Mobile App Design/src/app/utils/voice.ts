import { publicAnonKey } from '../../../utils/supabase/info.tsx';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';

const API_BASE = supabaseFunctionsApiBase;

const speechLanguageMap = {
  'en-sg': 'en-SG',
  'zh-sg': 'zh-CN',
  'zh-min': 'zh-CN',
  'zh-yue': 'zh-HK',
  'ms-sg': 'ms-MY',
  'ta-sg': 'ta-IN'
};

function getSpeechLanguage(language: string) {
  return speechLanguageMap[language] || speechLanguageMap['en-sg'];
}

function playBrowserSpeech(text: string, language: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    alert(text);
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechLanguage(language);
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return true;
}

export async function speakText(text: string, language: string, accessToken?: string) {
  if (!text.trim()) return false;

  if (accessToken) {
    try {
      const response = await fetch(`${API_BASE}/ai/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          apikey: publicAnonKey
        },
        body: JSON.stringify({ text, language })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`);
          await audio.play();
          return true;
        }
      }
    } catch (error) {
      console.log('Cloudflare TTS unavailable, using browser speech:', error);
    }
  }

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
