export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface AudioVisualizerData {
  volume: number;
}

export type Personality = 'Playful' | 'Romantic' | 'Serious' | 'Supportive' | 'Seductive';

export type Voice = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

export type ResponseLength = 'Short' | 'Long' | 'Surprise Me';