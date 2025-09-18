import { AspectRatio, VisualStyle, ImageGenerationModel, PosterEngine, RemixEngine, PosterGenerationModel } from './types';

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '9:16', '16:9', '3:4', '4:3'];

export const VISUAL_STYLES: VisualStyle[] = ['None', 'Minimalist', 'Retro', 'Cyberpunk', 'Abstract', 'Photorealistic'];

export const IMAGE_GENERATION_MODELS: ImageGenerationModel[] = ['Imagen 4.0', 'Gemini Nano (Free)', 'Gemini Pro (Free & Unlimited)', 'Gemini Flash (Experimental)'];

export const POSTER_GENERATION_MODELS: PosterGenerationModel[] = ['Gemini Nano (Free)', 'Gemini Pro (Free & Unlimited)', 'Gemini Flash (Experimental)'];

export const POSTER_ENGINES: PosterEngine[] = ['Balanced', 'Vivid'];

export const REMIX_ENGINES: RemixEngine[] = ['Subtle', 'Artistic'];

export const MODEL_IMAGE_EDIT = 'gemini-2.5-flash-image-preview';

export const DAILY_GENERATION_QUOTA = 25;