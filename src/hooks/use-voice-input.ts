'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Extend Window for Web Speech API (not in all TS libs)
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

/** Polyfill: required for Mobile Safari / Chrome which use webkit prefix. */
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
  return SpeechRecognition ?? null;
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|Mobile/i.test(navigator.userAgent) || (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints > 0;
}

export function useVoiceInput(options?: {
  language?: string;
  onTranscript?: (text: string) => void;
  /** Auto-run callback (e.g. trigger search) after silence for this many ms. 0 = disabled. */
  silenceAutoSubmitMs?: number;
}) {
  const language = options?.language ?? 'zh-CN';
  const onTranscript = options?.onTranscript;
  const silenceAutoSubmitMs = options?.silenceAutoSubmitMs ?? 0;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('当前浏览器不支持语音识别');
      return;
    }

    if (recognitionRef.current) {
      stopListening();
    }

    const recognition = new SR() as SpeechRecognitionInstance;
    recognitionRef.current = recognition;
    // Mobile: continuous=false to stop after one phrase (battery/bugs); desktop can stay true.
    recognition.continuous = !isMobile();
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        full += result[0]?.transcript ?? '';
      }
      const trimmed = full.trim();
      if (trimmed) {
        setTranscript(trimmed);
        onTranscript?.(trimmed);
      }
      if (silenceAutoSubmitMs > 0 && trimmed) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          stopListening();
        }, silenceAutoSubmitMs);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const err = event.error ?? 'unknown';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setError('需要麦克风权限');
      } else if (err === 'no-speech') {
        setError(null);
      } else {
        setError(`语音识别错误: ${err}`);
      }
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      setError('无法启动语音识别');
      setIsListening(false);
    }
  }, [language, onTranscript, silenceAutoSubmitMs, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript('');
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Strict: hide/disable UI when API is missing (e.g. unsupported mobile browser).
  const isSupported = typeof window !== 'undefined' && !!getSpeechRecognition();

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
  };
}
