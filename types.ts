
export enum AppState {
  UPLOADING_PRODUCT = 'UPLOADING_PRODUCT',
  PROCESSING_PRODUCT = 'PROCESSING_PRODUCT',
  PROVIDING_CONCEPT = 'PROVIDING_CONCEPT',
  GENERATING_POSTER = 'GENERATING_POSTER',
  EDITING = 'EDITING',
}

export type AppMode = 'poster' | 'image' | 'assistant';

export type AspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3';

export type VisualStyle = 'None' | 'Minimalist' | 'Retro' | 'Cyberpunk' | 'Abstract' | 'Photorealistic';

export type ImageGenerationModel = 'Imagen 4.0' | 'Gemini Nano (Free)';

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text?: string; image?: ImageData }[];
}