import { useRef, useState, useCallback, useEffect } from 'react';
import { electronAPI } from '@/lib/electron-api';
import type { VoiceState, UseRealtimeVoiceReturn, TranscriptEvent, VoiceToolCallEvent } from './useRealtimeVoice';

interface UseGrokVoiceOptions {
  apiKey: string;
  voice?: string;
  instructions?: string;
  onTranscript: (event: TranscriptEvent) => void;
  onToolCall?: (event: VoiceToolCallEvent) => void;
  onError?: (error: string) => void;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Failed to connect Grok voice';
}

// REALTIME_TOOLS definition — same format used for session.update
const REALTIME_TOOLS = [
  {
    type: 'function' as const,
    name: 'list_files',
    description: 'List all markdown files in the current vault',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'read_file',
    description: 'Read the contents of a file in the vault',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path relative to vault root' } },
      required: ['path'],
    },
  },
  {
    type: 'function' as const,
    name: 'write_file',
    description: 'Write or create a file with given content',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to vault root' },
        content: { type: 'string', description: 'The content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    type: 'function' as const,
    name: 'edit_file',
    description: 'Edit a file by replacing old text with new text',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to vault root' },
        old_text: { type: 'string', description: 'The text to find and replace' },
        new_text: { type: 'string', description: 'The replacement text' },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
  {
    type: 'function' as const,
    name: 'delete_file',
    description: 'Delete a file from the vault',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path relative to vault root' } },
      required: ['path'],
    },
  },
  {
    type: 'function' as const,
    name: 'search_files',
    description: 'Search for text across all files in the vault',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'The search query' } },
      required: ['query'],
    },
  },
];

export function useGrokVoice({
  apiKey,
  voice,
  instructions,
  onTranscript,
  onToolCall,
  onError,
}: UseGrokVoiceOptions): UseRealtimeVoiceReturn {
  const [state, _setState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef<VoiceState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const setState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    _setState(s);
  }, []);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onToolCallRef = useRef(onToolCall);
  onToolCallRef.current = onToolCall;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stopPlayback = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch {}
    }
    activeSourcesRef.current = [];
    playbackTimeRef.current = 0;
  }, []);

  const cleanup = useCallback(() => {
    stopPlayback();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    cancelAnimationFrame(rafRef.current);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }

    playbackTimeRef.current = 0;
    setAudioLevel(0);
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setState('idle');
  }, [cleanup, setState]);

  const connect = useCallback(async () => {
    if (stateRef.current === 'connecting' || stateRef.current === 'connected') return;

    setState('connecting');

    try {
      // 1. Get ephemeral token
      const session = await electronAPI.createGrokSession({ apiKey });

      // 2. Connect WebSocket with subprotocol auth
      const ws = new WebSocket(
        'wss://api.x.ai/v1/realtime',
        ['realtime', `xai-client-secret.${session.clientSecret}`]
      );
      wsRef.current = ws;

      // Connection timeout
      timeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'connecting') {
          onErrorRef.current?.('Grok voice connection timed out. Please try again.');
          disconnect();
        }
      }, 15000);

      // 3. Get mic stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setState('error');
        onErrorRef.current?.('Microphone access denied. Please allow mic permissions and try again.');
        cleanup();
        return;
      }
      streamRef.current = stream;

      // 4. Audio contexts
      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playbackCtx;

      if (playbackCtx.state === 'suspended') {
        await playbackCtx.resume();
      }

      // 5. Audio level metering
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const meterLoop = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setAudioLevel(avg);
        rafRef.current = requestAnimationFrame(meterLoop);
      };
      rafRef.current = requestAnimationFrame(meterLoop);

      // 6. Mic capture → PCM16 → base64 → WebSocket
      // Use ScriptProcessorNode for broad compatibility
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(audioCtx.destination); // Required for processing to run

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64,
        }));
      };

      // 7. WebSocket event handlers
      ws.onopen = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setState('connected');

        // Send session.update with voice, instructions, tools
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            voice: voice || 'Ara',
            instructions: instructions || '',
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: { model: 'grok-2-latest' },
            tools: REALTIME_TOOLS,
          },
        }));
      };

      ws.onclose = () => {
        if (stateRef.current === 'connected') {
          onErrorRef.current?.('Grok voice connection closed.');
          disconnect();
        }
      };

      ws.onerror = () => {
        onErrorRef.current?.('Grok voice connection error.');
        disconnect();
      };

      ws.onmessage = (e) => {
        (async () => {
          try {
            const event = JSON.parse(e.data);

            if (event.type === 'error') {
              console.warn('[grok-voice] server error:', event.error?.message || event);
              return;
            }

            switch (event.type) {
              // User started speaking — interrupt assistant audio
              case 'input_audio_buffer.speech_started':
                stopPlayback();
                break;

              // User speech transcription
              case 'conversation.item.input_audio_transcription.completed':
                onTranscriptRef.current({
                  role: 'user',
                  content: event.transcript ?? '',
                  final: true,
                });
                break;

              // Assistant audio transcript (streaming)
              case 'response.audio_transcript.delta':
              case 'response.output_audio_transcript.delta':
                onTranscriptRef.current({
                  role: 'assistant',
                  content: event.delta ?? '',
                  final: false,
                });
                break;

              // Assistant audio transcript (final)
              case 'response.audio_transcript.done':
              case 'response.output_audio_transcript.done':
                onTranscriptRef.current({
                  role: 'assistant',
                  content: event.transcript ?? '',
                  final: true,
                });
                break;

              // Audio playback
              case 'response.audio.delta':
              case 'response.output_audio.delta': {
                const audioData = event.delta;
                if (!audioData || !playbackCtxRef.current) break;

                // Decode base64 → Int16 → Float32 → play
                const binaryStr = atob(audioData);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  bytes[i] = binaryStr.charCodeAt(i);
                }
                const int16 = new Int16Array(bytes.buffer);
                const float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) {
                  float32[i] = int16[i] / 32768;
                }

                const pCtx = playbackCtxRef.current;
                const buffer = pCtx.createBuffer(1, float32.length, 24000);
                buffer.getChannelData(0).set(float32);

                const sourceNode = pCtx.createBufferSource();
                sourceNode.buffer = buffer;
                sourceNode.connect(pCtx.destination);

                // Schedule playback sequentially
                const now = pCtx.currentTime;
                const startTime = Math.max(now, playbackTimeRef.current);
                sourceNode.start(startTime);
                playbackTimeRef.current = startTime + buffer.duration;

                // Track for interruption cleanup
                activeSourcesRef.current.push(sourceNode);
                sourceNode.onended = () => {
                  activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== sourceNode);
                };
                break;
              }

              // Tool calls
              case 'response.function_call_arguments.done': {
                const toolName = event.name;
                const callId = event.call_id;
                let args: Record<string, string> = {};
                try {
                  args = JSON.parse(event.arguments || '{}');
                } catch {
                  args = {};
                }

                console.log('[grok-voice] tool call:', toolName, args);

                let result: string;
                try {
                  result = await electronAPI.executeRealtimeTool({ toolName, args });
                } catch (err) {
                  result = `Error: ${err instanceof Error ? err.message : 'Tool execution failed'}`;
                }

                onToolCallRef.current?.({ name: toolName, args, result });

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: callId,
                      output: result,
                    },
                  }));
                  wsRef.current.send(JSON.stringify({ type: 'response.create' }));
                }
                break;
              }
            }
          } catch {
            // Ignore malformed messages
          }
        })();
      };
    } catch (err) {
      const msg = toErrorMessage(err);
      setState('error');
      onErrorRef.current?.(msg);
      cleanup();
    }
  }, [apiKey, voice, instructions, cleanup, disconnect, setState, stopPlayback]);

  // Update session instructions when they change mid-session (e.g. vault switch)
  useEffect(() => {
    if (stateRef.current === 'connected' && wsRef.current?.readyState === WebSocket.OPEN && instructions) {
      wsRef.current.send(JSON.stringify({
        type: 'session.update',
        session: { instructions: instructions },
      }));
    }
  }, [instructions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { state, connect, disconnect, audioLevel };
}
