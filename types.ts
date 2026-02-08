
export interface Point {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alt?: number;
  description?: string;
  timestamp: number;
}

export interface ProjectionSettings {
  type: 'UTM' | 'TM'; 
  width: 3 | 6;
  centralMeridian?: number; 
  autoZone: boolean;
  datum: 'ITRF96' | 'ED50';
}

export enum AppMode {
  MAP = 'MAP',
  CALCULATIONS = 'CALCULATIONS',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
