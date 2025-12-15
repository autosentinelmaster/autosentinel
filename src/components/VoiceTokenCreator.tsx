import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Speech Recognition types for browser compatibility
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface ParsedCommand {
  childName?: string;
  speedLimit?: number;
  timeLimit?: number;
  distanceLimit?: number;
  geofenceRadius?: number;
  error?: string;
}

interface VoiceTokenCreatorProps {
  onTokenParsed: (params: ParsedCommand) => void;
}

export function VoiceTokenCreator({ onTokenParsed }: VoiceTokenCreatorProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        setTranscript(result[0].transcript);
        
        if (result.isFinal) {
          processVoiceCommand(result[0].transcript);
        }
      };

      recognitionRef.current.onerror = () => {
        console.error('Speech recognition error');
        setIsListening(false);
        toast.error('Voice recognition failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const processVoiceCommand = async (text: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-voice-command', {
        body: { transcript: text }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
      } else if (data.childName) {
        toast.success(`Parsed: ${data.childName}, ${data.speedLimit || 60}km/h, ${data.timeLimit || 30}min`);
        onTokenParsed(data);
      } else {
        toast.error('Could not understand command. Try: "Create token for John with 80 speed limit"');
      }
    } catch (error) {
      console.error('Error processing voice:', error);
      toast.error('Failed to process voice command');
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={toggleListening}
        disabled={isProcessing}
        className="h-12 w-12 rounded-full"
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      {isListening && (
        <p className="text-xs text-muted-foreground animate-pulse">Listening...</p>
      )}
      {transcript && (
        <p className="text-xs text-center max-w-[200px] truncate">{transcript}</p>
      )}
    </div>
  );
}
