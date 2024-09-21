// global.d.ts
declare global {
  interface Window {
    SpeechRecognition: typeof webkitSpeechRecognition;
  }

  const SpeechRecognition: typeof webkitSpeechRecognition;

  type SpeechRecognition = {
    new (): SpeechRecognition;
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    start(): void;
    stop(): void;
    onstart: (event: Event) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: (event: Event) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
  };

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }

  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
