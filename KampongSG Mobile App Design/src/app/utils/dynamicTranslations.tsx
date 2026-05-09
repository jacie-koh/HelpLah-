import { useEffect, useMemo, useState } from 'react';
import { publicAnonKey } from '../../../utils/supabase/info.tsx';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';

const API_BASE = supabaseFunctionsApiBase;
const cache = new Map<string, string>();

function cacheKey(language: string, text: string) {
  return `${language}::${text}`;
}

function uniqueVisibleTexts(texts: Array<string | null | undefined>) {
  return Array.from(new Set(
    texts
      .map((text) => String(text || '').trim())
      .filter(Boolean)
  ));
}

export function useDynamicTranslations(
  texts: Array<string | null | undefined>,
  language: string,
  accessToken?: string
) {
  const uniqueTexts = useMemo(
    () => uniqueVisibleTexts(texts),
    [JSON.stringify(texts)]
  );
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    if (language === 'en-sg' || uniqueTexts.length === 0 || !accessToken) {
      setTranslations({});
      return () => {
        isMounted = false;
      };
    }

    const cachedTranslations: Record<string, string> = {};
    const missingTexts: string[] = [];

    uniqueTexts.forEach((text) => {
      const cached = cache.get(cacheKey(language, text));
      if (cached) {
        cachedTranslations[text] = cached;
      } else {
        missingTexts.push(text);
      }
    });

    setTranslations(cachedTranslations);
    if (missingTexts.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    async function translateMissing() {
      try {
        const response = await fetch(`${API_BASE}/ai/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            apikey: publicAnonKey
          },
          body: JSON.stringify({
            language,
            texts: missingTexts
          })
        });

        if (!response.ok) {
          console.log(`Dynamic translation HTTP ${response.status}`);
          return;
        }
        const data = await response.json();
        const translated = data.translations || {};
        Object.entries(translated).forEach(([source, translatedText]) => {
          if (typeof translatedText === 'string' && translatedText.trim() && translatedText !== '...') {
            cache.set(cacheKey(language, source), translatedText);
          }
        });

        if (isMounted) {
          setTranslations((current) => ({ ...current, ...translated }));
        }
      } catch (error) {
        console.log('Dynamic translation failed:', error);
      }
    }

    translateMissing();
    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(uniqueTexts), language, accessToken]);

  function dt(text: string | null | undefined) {
    const source = String(text || '').trim();
    if (!source) return '';
    if (language === 'en-sg') return source;
    return translations[source] || '...';
  }

  return dt;
}
