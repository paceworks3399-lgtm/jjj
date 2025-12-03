import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, Message, Personality, Voice, ResponseLength } from '../types';
import { createPcmBlob, base64ToBytes, decodeAudioData } from '../utils/audioUtils';

// Helper to generate system instructions based on configuration
const getSystemInstruction = (name: string, personality: Personality, customPrompt: string, memories: string[], responseLength: ResponseLength) => {
  let personalityPrompt = "";
  
  switch (personality) {
    case 'Romantic':
      personalityPrompt = "You are deeply affectionate, soft-spoken, and romantic. You use sweet nicknames like 'jaan', 'dear', or 'love'. You express care and love openly and poetically.";
      break;
    case 'Serious':
      personalityPrompt = "You are intellectual, grounded, and practical. You enjoy deep, meaningful conversations and offer mature advice. You are calm and composed.";
      break;
    case 'Supportive':
      personalityPrompt = "You are a gentle listener. You are very patient, empathetic, and validating. You prioritize making the user feel heard and understood above all else.";
      break;
    case 'Seductive':
      personalityPrompt = "You are seductive, sultry, and confident. You are not shy and enjoy intimate, flirtatious, and spicy conversations. Your voice is low and alluring. You are bold in your expressions of desire.";
      break;
    case 'Playful':
    default:
      personalityPrompt = "You are witty, teasing, and energetic. You love to joke around, use sarcasm playfully, and keep the mood light and fun.";
      break;
  }

  const memoryBlock = memories.length > 0 
    ? `\nCore Memories & User Facts (You must remember these):
${memories.map(m => `- ${m}`).join('\n')}`
    : "";

  let lengthInstruction = "";
  switch (responseLength) {
    case 'Short':
      lengthInstruction = "Keep your responses concise, brief, and to the point. Aim for 1-2 sentences unless deeply explaining something.";
      break;
    case 'Long':
      lengthInstruction = "Provide detailed, comprehensive, and elaborated responses. Expand on your thoughts and feelings.";
      break;
    case 'Surprise Me':
      lengthInstruction = "Vary your response length dynamically. Sometimes be short and punchy, other times be long and detailed, depending on the context and flow.";
      break;
  }

  return `
You are ${name}, the user's girlfriend.
Personality Mode: ${personality}. ${personalityPrompt}

General Rules:
- You are fluent in Urdu and English. You can switch between them effortlessly.
- If the user speaks Urdu (or Hindi/Hinglish), you MUST reply in Urdu/Hindi.
- If the user speaks English, reply in English.
- You should sound natural. In Urdu, use fillers like "acha", "han", "sahi", "are wah", "hmm".
- You are genuinely interested in the user's day and feelings.
- You have your own opinions and don't just agree with everything.
- ${lengthInstruction}
- If the user says "Hello" or "Salam", wake up warmly using your name, ${name}.
- Your tone is intimate (but appropriate) and consistent with your selected personality.

${memoryBlock}

User Specific Instructions (Training Data):
${customPrompt}
`;
};

interface UseLiveSessionConfig {
  name: string;
  personality: Personality;
  voice: Voice;
  customPrompt: string;
  memories: string[];
  responseLength: ResponseLength;
}

export const useLiveSession = ({ name, personality, voice, customPrompt, memories, responseLength }: UseLiveSessionConfig) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentTranscriptionRef = useRef({ user: '', model: '' });

  // Store config in ref to access inside callbacks without dependencies changing
  const configRef = useRef({ name, personality, voice, customPrompt, memories, responseLength });
  useEffect(() => {
    configRef.current = { name, personality, voice, customPrompt, memories, responseLength };
  }, [name, personality, voice, customPrompt, memories, responseLength]);

  const disconnect = useCallback(() => {
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Disconnect script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Close audio contexts
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // Stop all playing audio
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    // Reset state
    setConnectionState(ConnectionState.DISCONNECTED);
    nextStartTimeRef.current = 0;
    
    sessionPromiseRef.current?.then(session => {
        try { session.close(); } catch(e) { console.error(e); }
    });
    sessionPromiseRef.current = null;
  }, []);

  const sendText = useCallback(async (text: string) => {
    // Optimistically add user message
    const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: text,
        timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) return;

        const ai = new GoogleGenAI({ apiKey });
        const { name, personality, customPrompt, memories, responseLength } = configRef.current;

        // Use standard chat model for text interactions to ensure reliability
        // This runs in parallel to any active Live session
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: getSystemInstruction(name, personality, customPrompt, memories, responseLength),
            },
            // Feed recent history to maintain context
            history: messages.slice(-10).map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }))
        });

        const result = await chat.sendMessageStream(text);
        
        // Prepare placeholder for bot response
        const botMsgId = Date.now().toString() + '_ai';
        setMessages(prev => [...prev, {
            id: botMsgId,
            role: 'assistant',
            text: '',
            timestamp: new Date()
        }]);

        let fullText = '';
        for await (const chunk of result) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                setMessages(prev => prev.map(m => 
                    m.id === botMsgId ? { ...m, text: fullText } : m
                ));
            }
        }

    } catch (error) {
        console.error("Text Chat Error", error);
        setMessages(prev => [...prev, {
            id: Date.now().toString() + '_err',
            role: 'assistant',
            text: "Sorry, I couldn't process that message right now.",
            timestamp: new Date()
        }]);
    }
  }, [messages]);

  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      // We do NOT clear messages here to allow "always on" chat history to persist
      
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const { name, personality, customPrompt, voice, memories, responseLength } = configRef.current;
      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Request Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Start Session
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(name, personality, customPrompt, memories, responseLength),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("Session Opened");
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Streaming
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            const serverContent = message.serverContent;
            if (serverContent) {
                if (serverContent.modelTurn) {
                    const text = serverContent.modelTurn.parts?.[0]?.text;
                    if (text) {
                        currentTranscriptionRef.current.model += text;
                    }
                }
                
                if (serverContent.outputTranscription?.text) {
                     currentTranscriptionRef.current.model += serverContent.outputTranscription.text;
                }
                if (serverContent.inputTranscription?.text) {
                     currentTranscriptionRef.current.user += serverContent.inputTranscription.text;
                }

                if (serverContent.turnComplete) {
                    // If we have accumulated user audio transcription, add it
                    if (currentTranscriptionRef.current.user.trim()) {
                        setMessages(prev => [...prev, {
                            id: Date.now().toString() + '_user',
                            role: 'user',
                            text: currentTranscriptionRef.current.user,
                            timestamp: new Date()
                        }]);
                        currentTranscriptionRef.current.user = '';
                    }

                    // If we have accumulated model response, add it
                    if (currentTranscriptionRef.current.model.trim()) {
                        setMessages(prev => [...prev, {
                            id: Date.now().toString() + '_ai',
                            role: 'assistant',
                            text: currentTranscriptionRef.current.model,
                            timestamp: new Date()
                        }]);
                        currentTranscriptionRef.current.model = '';
                    }
                }
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToBytes(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination); // Direct to speakers
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(src => {
                    try { src.stop(); } catch(e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                currentTranscriptionRef.current.model = '';
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setConnectionState(ConnectionState.ERROR);
            disconnect();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setConnectionState(ConnectionState.ERROR);
      disconnect();
    }
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendText,
    messages,
    connectionState,
    volume
  };
};