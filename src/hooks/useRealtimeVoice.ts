import { useRef, useState, useCallback, useEffect } from 'react';
import { electronAPI } from '@/lib/electron-api';

export type VoiceState = 'idle' | 'connecting' | 'connected' | 'error';

export interface TranscriptEvent {
  role: 'user' | 'assistant';
  content: string;
  final: boolean;
}

export interface VoiceToolCallEvent {
  name: string;
  args: Record<string, string>;
  result: string;
}

export type ExecuteToolFn = (toolName: string, args: Record<string, string>) => Promise<string>;

interface UseRealtimeVoiceOptions {
  apiKey: string;
  voice?: string;
  instructions?: string;
  onTranscript: (event: TranscriptEvent) => void;
  onToolCall?: (event: VoiceToolCallEvent) => void;
  onError?: (error: string) => void;
  /** Optional: override tool execution (e.g. for voice tools that need renderer state) */
  executeTool?: ExecuteToolFn;
}

export interface UseRealtimeVoiceReturn {
  state: VoiceState;
  connect: () => Promise<void>;
  disconnect: () => void;
  audioLevel: number;
}

/** Extract a readable message from any caught value. */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err instanceof Event) {
    // RTCErrorEvent, MediaError, etc.
    const re = err as Event & { error?: { message?: string }; message?: string };
    return re.error?.message || re.message || `WebRTC ${err.type} error`;
  }
  if (typeof err === 'string') return err;
  return 'Failed to connect voice';
}

export function useRealtimeVoice({
  apiKey,
  voice,
  instructions,
  onTranscript,
  onToolCall,
  onError,
  executeTool: executeToolOverride,
}: UseRealtimeVoiceOptions): UseRealtimeVoiceReturn {
  const [state, _setState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<VoiceState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    _setState(s);
  }, []);

  // Keep callbacks in refs so we don't re-create connect/disconnect
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onToolCallRef = useRef(onToolCall);
  onToolCallRef.current = onToolCall;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const executeToolRef = useRef(executeToolOverride);
  executeToolRef.current = executeToolOverride;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    cancelAnimationFrame(rafRef.current);

    if (dcRef.current) {
      dcRef.current.onerror = null;
      dcRef.current.onmessage = null;
      dcRef.current.close();
      dcRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.onerror = null;
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }

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
      // 1. Get ephemeral key
      const session = await electronAPI.createRealtimeSession({
        apiKey,
        voice,
        instructions,
      });

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Connection timeout — if not connected within 15s, give up
      timeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'connecting') {
          onErrorRef.current?.('Voice connection timed out. Please try again.');
          disconnect();
        }
      }, 15000);

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setState('connected');
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected'
        ) {
          onErrorRef.current?.('Voice connection lost.');
          disconnect();
        }
      };

      // 3. Play remote audio
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;

      audioEl.onerror = () => {};

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 4. Get mic stream and add track
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setState('error');
        onErrorRef.current?.(
          'Microphone access denied. Please allow mic permissions and try again.'
        );
        cleanup();
        return;
      }
      streamRef.current = stream;
      pc.addTrack(stream.getTracks()[0], stream);

      // 5. Audio level metering
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

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

      // 6. Data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onerror = (evt) => {
        const msg = toErrorMessage(evt);
        console.warn('[voice] data channel error:', msg);
      };

      dc.onopen = () => {};

      dc.onmessage = (e) => {
        (async () => {
          try {
            const event = JSON.parse(e.data);

            if (event.type === 'error') {
              console.warn('[voice] server error:', event.error?.message || event);
              return;
            }

            switch (event.type) {
              case 'conversation.item.input_audio_transcription.completed':
                onTranscriptRef.current({
                  role: 'user',
                  content: event.transcript ?? '',
                  final: true,
                });
                break;
              // OpenAI Realtime API uses output_audio_transcript (not audio_transcript)
              case 'response.audio_transcript.delta':
              case 'response.output_audio_transcript.delta':
                onTranscriptRef.current({
                  role: 'assistant',
                  content: event.delta ?? '',
                  final: false,
                });
                break;
              case 'response.audio_transcript.done':
              case 'response.output_audio_transcript.done':
                onTranscriptRef.current({
                  role: 'assistant',
                  content: event.transcript ?? '',
                  final: true,
                });
                break;
              case 'response.function_call_arguments.done': {
                const toolName = event.name;
                const callId = event.call_id;
                let args: Record<string, string> = {};
                try {
                  args = JSON.parse(event.arguments || '{}');
                } catch {
                  args = {};
                }

                let result: string;
                try {
                  const fn = executeToolRef.current;
                  result = fn
                    ? await fn(toolName, args)
                    : await electronAPI.executeRealtimeTool({ toolName, args });
                } catch (err) {
                  result = `Error: ${err instanceof Error ? err.message : 'Tool execution failed'}`;
                }

                onToolCallRef.current?.({ name: toolName, args, result });

                if (dc.readyState === 'open') {
                  dc.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: callId,
                      output: result,
                    },
                  }));
                  dc.send(JSON.stringify({ type: 'response.create' }));
                }
                break;
              }
            }
          } catch {
            // Ignore malformed messages
          }
        })();
      };

      // 7. Create SDP offer and exchange with OpenAI
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime/calls',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.clientSecret}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) {
        const text = await sdpRes.text();
        throw new Error(`SDP exchange failed (${sdpRes.status}): ${text}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // If already connected by this point
      if (pc.connectionState === 'connected') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setState('connected');
      }
    } catch (err) {
      const msg = toErrorMessage(err);
      setState('error');
      onErrorRef.current?.(msg);
      cleanup();
    }
  }, [apiKey, voice, instructions, cleanup, disconnect, setState]);

  // Update session instructions and voice when they change mid-session (e.g. vault switch, voice change)
  useEffect(() => {
    if (stateRef.current === 'connected' && dcRef.current?.readyState === 'open') {
      const payload: { instructions?: string; audio?: { output: { voice: string } } } = {};
      if (instructions) payload.instructions = instructions;
      if (voice) payload.audio = { output: { voice } };
      if (Object.keys(payload).length > 0) {
        dcRef.current.send(JSON.stringify({
          type: 'session.update',
          session: payload,
        }));
      }
    }
  }, [instructions, voice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { state, connect, disconnect, audioLevel };
}
