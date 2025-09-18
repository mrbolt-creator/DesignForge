
import { GoogleGenAI, Modality, Chat } from "@google/genai";
import { ImageData, VisualStyle, AspectRatio, ImageGenerationModel, PosterEngine, RemixEngine, PosterGenerationModel } from '../types';
import { MODEL_IMAGE_EDIT } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const handleApiError = (error: any, context: string): Error => {
    console.error(`Error during ${context}:`, error);

    const quotaErrorMessage = "You've exceeded the daily usage limit for this AI model. Please select a different model (like Gemini Nano or Gemini Pro), or try again tomorrow when your quota resets.";

    // Broadly check for quota error indicators in the entire error structure.
    // Stringify to catch everything, then check for specific properties.
    let fullErrorString = '';
    try {
        fullErrorString = JSON.stringify(error).toLowerCase();
    } catch(e) {
        fullErrorString = String(error).toLowerCase();
    }
    
    const hasQuotaIndicators = 
        fullErrorString.includes('quota') ||
        fullErrorString.includes('rate limit') ||
        fullErrorString.includes('resource_exhausted') ||
        fullErrorString.includes('429');

    if (hasQuotaIndicators) {
        return new Error(quotaErrorMessage);
    }

    // For other errors, try to find a meaningful message.
    let specificMessage = error?.error?.message || error?.message;

    // If the message is still a JSON object, fall back to a generic message.
    if (typeof specificMessage !== 'string' || specificMessage.trim().startsWith('{')) {
        specificMessage = `Failed to ${context}. An unexpected error occurred. Please try again.`;
    }

    return new Error(specificMessage);
};

const fileToGenerativePart = (imageData: ImageData) => {
  return {
    inlineData: {
      data: imageData.base64,
      mimeType: imageData.mimeType,
    },
  };
};

const extractImageFromResult = (result: any): ImageData | null => {
    if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
        for (const part of result.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    base64: part.inlineData.data,
                    mimeType: part.inlineData.mimeType
                };
            }
        }
    }
    return null;
}

const getDimensionsForAspectRatio = (aspectRatio: string): string => {
    switch (aspectRatio) {
        case '1:1': return '1024x1024 pixels';
        case '9:16': return '1080x1920 pixels';
        case '16:9': return '1920x1080 pixels';
        case '3:4': return '1080x1440 pixels';
        case '4:3': return '1440x1080 pixels';
        default: return '';
    }
};

export const removeBackground = async (productImage: ImageData): Promise<ImageData> => {
    try {
        const result = await ai.models.generateContent({
            model: MODEL_IMAGE_EDIT,
            contents: {
                parts: [
                    fileToGenerativePart(productImage),
                    { text: 'Isolate the main subject from the background. Make the background transparent.' },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const editedImage = extractImageFromResult(result);
        if (!editedImage) {
            throw new Error('AI could not process the image. Please try a different image.');
        }
        return editedImage;
    } catch (error) {
        throw handleApiError(error, "remove background from the image");
    }
};

export const generatePoster = async (
    productImage: ImageData, 
    concept: string, 
    aspectRatio: string,
    style: VisualStyle,
    referenceImage: ImageData | null | undefined,
    numberOfVariations: number,
    posterEngine: PosterEngine,
    model: PosterGenerationModel,
): Promise<ImageData[]> => {
    try {
        const engineInstruction = posterEngine === 'Vivid'
            ? 'Create a dynamic, vibrant, high-contrast, and dramatic product poster featuring the provided product.'
            : 'Create a futuristic, visually stunning, and catchy product poster featuring the provided product.';
        const experimentalInstruction = model === 'Gemini Flash (Experimental)' ? 'The poster should have a highly detailed and cinematic feel, with photorealistic lighting and textures. ' : '';
        const styleInstruction = style !== 'None' ? `The overall visual style must be ${style}.` : '';
        const dimensions = getDimensionsForAspectRatio(aspectRatio);
        const dimensionInstruction = dimensions
            ? `The poster's dimensions must be exactly ${dimensions} (a ${aspectRatio} aspect ratio).`
            : `The poster's aspect ratio must be exactly ${aspectRatio}.`;

        const parts = [
            fileToGenerativePart(productImage),
            { text: `${experimentalInstruction}${engineInstruction}
               Concept: "${concept}".
               ${styleInstruction}
               This is the most critical instruction: ${dimensionInstruction} Adhere to these output dimensions strictly.
               Integrate the product seamlessly and realistically into the generated scene. Pay close attention to matching the lighting, shadows, and perspective of the product with the background environment. The product should look like it is naturally part of the scene, not just placed on top.
               Do not add any text, words, letters, or logos to the poster. The poster should be purely visual.
               The final output should be a single, high-quality, poster image.` },
        ];

        if (referenceImage) {
            parts.push(fileToGenerativePart(referenceImage));
            parts.push({ text: "Use the second image as a style and theme reference for the poster." });
        }
        
        const generationPromises = Array.from({ length: numberOfVariations }).map(() => 
            ai.models.generateContent({
                model: MODEL_IMAGE_EDIT,
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            })
        );
        
        const results = await Promise.all(generationPromises);
        const posterImages = results.map(extractImageFromResult).filter((img): img is ImageData => img !== null);

        if (posterImages.length === 0) {
            throw new Error('AI failed to generate a poster. Please try a different concept.');
        }
        return posterImages;
    } catch (error) {
        throw handleApiError(error, "generate the poster");
    }
};

export const editPoster = async (currentPoster: ImageData, editPrompt: string, style: VisualStyle): Promise<ImageData> => {
    try {
        const styleInstruction = style !== 'None' ? `Apply a ${style} visual style to the image.` : '';
        const editInstruction = editPrompt ? `Edit the provided poster based on this instruction: "${editPrompt}".` : '';
        
        if (!styleInstruction && !editInstruction) {
            // This case should be handled in the component, but as a safeguard:
            return currentPoster; 
        }

        const prompt = `${editInstruction} ${styleInstruction} Only output the final edited image.`.trim();
        
        const result = await ai.models.generateContent({
            model: MODEL_IMAGE_EDIT,
            contents: {
                parts: [
                    fileToGenerativePart(currentPoster),
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const editedImage = extractImageFromResult(result);
        if (!editedImage) {
            throw new Error('AI could not apply the edits. Please try a different instruction.');
        }
        return editedImage;
    } catch (error) {
        throw handleApiError(error, "edit the poster");
    }
};

export const generateImage = async (
    prompt: string,
    aspectRatio: AspectRatio,
    style: VisualStyle,
    model: ImageGenerationModel,
    numberOfVariations: number,
    negativePrompt: string,
    seed?: number,
): Promise<ImageData[]> => {
    try {
        const styleInstruction = style !== 'None' ? `${style} style. ` : '';

        if (model === 'Imagen 4.0') {
            const fullPrompt = `${styleInstruction}${prompt}`;
            
            const config: any = {
                numberOfImages: numberOfVariations,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            };

            if (negativePrompt.trim()) {
                config.negativePrompt = negativePrompt;
            }
            if (seed !== undefined) {
                config.seed = seed;
            }

            const result = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fullPrompt,
                config,
            });
            
            if (!result.generatedImages || result.generatedImages.length === 0) {
                throw new Error('AI failed to generate an image. Please try a different prompt.');
            }
    
            return result.generatedImages.map(img => ({
                base64: img.image.imageBytes,
                mimeType: 'image/png',
            }));
        } else { // Any other Gemini model like 'Gemini Nano (Free)', 'Gemini Pro (Free & Unlimited)', or 'Gemini Flash (Experimental)'
             const experimentalInstruction = model === 'Gemini Flash (Experimental)' ? 'The image should be highly detailed with a cinematic feel. ' : '';
             const negativePromptInstruction = negativePrompt.trim() ? `\n\nImportant: Do not include the following elements in the image: ${negativePrompt}.` : '';
             const fullPrompt = `${experimentalInstruction}${styleInstruction}${prompt}${negativePromptInstruction}`;
             
             const config: any = {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
             };
             if (seed !== undefined) {
                config.seed = seed;
             }

             const generationPromises = Array.from({ length: numberOfVariations }).map(() => 
                ai.models.generateContent({
                    model: MODEL_IMAGE_EDIT, // 'gemini-2.5-flash-image-preview'
                    contents: {
                        parts: [
                            { text: fullPrompt },
                        ],
                    },
                    config,
                })
             );
            const results = await Promise.all(generationPromises);
            const generatedImages = results.map(extractImageFromResult).filter((img): img is ImageData => img !== null);

            if (generatedImages.length === 0) {
                throw new Error('AI failed to generate an image with this model. Please try a different prompt or model.');
            }
            return generatedImages;
        }

    } catch (error) {
        throw handleApiError(error, "generate the image");
    }
};

export const generateLogo = async (
    prompt: string,
    style: VisualStyle,
    colors: string,
    numberOfVariations: number,
    model: ImageGenerationModel,
): Promise<ImageData[]> => {
    try {
        const basePrompt = `A professional, modern, vector-style logo for: "${prompt}".
The logo must be on a clean, solid, plain white background.
It should be simple, iconic, memorable, and easily scalable for various uses.
The design should be a flat 2D graphic icon. Avoid 3D effects, complex gradients, or photorealism.
Crucially, do not include any text, letters, or words in the logo itself. The output must be the graphic icon only.`;

        const styleInstruction = style !== 'None' ? `The visual style should be: ${style}.` : 'The visual style should be minimalist and clean.';
        const colorInstruction = colors.trim() ? `Incorporate this color palette: ${colors}.` : '';
        
        const initialPromptParts = [basePrompt, styleInstruction, colorInstruction];

        if (model === 'Imagen 4.0') {
            const fullPrompt = initialPromptParts.filter(Boolean).join('\n');
            const result = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fullPrompt,
                config: {
                    numberOfImages: numberOfVariations,
                    outputMimeType: 'image/png',
                    aspectRatio: '1:1', // Logos are best designed in a square format
                },
            });
            
            if (!result.generatedImages || result.generatedImages.length === 0) {
                throw new Error('AI failed to generate a logo. Please try a different prompt.');
            }
    
            return result.generatedImages.map(img => ({
                base64: img.image.imageBytes,
                mimeType: 'image/png',
            }));
        } else { // Any other Gemini model like 'Gemini Nano (Free)', 'Gemini Pro (Free & Unlimited)', or 'Gemini Flash (Experimental)'
             const experimentalInstruction = model === 'Gemini Flash (Experimental)' ? 'The logo should be abstract and conceptual.' : '';
             const fullPrompt = [...initialPromptParts, experimentalInstruction].filter(Boolean).join('\n');
             const generationPromises = Array.from({ length: numberOfVariations }).map(() =>
                ai.models.generateContent({
                    model: MODEL_IMAGE_EDIT, // 'gemini-2.5-flash-image-preview'
                    contents: { parts: [{ text: fullPrompt }] },
                    config: {
                        responseModalities: [Modality.IMAGE, Modality.TEXT],
                    },
                })
            );
            const results = await Promise.all(generationPromises);
            const generatedLogos = results.map(extractImageFromResult).filter((img): img is ImageData => img !== null);

            if (generatedLogos.length === 0) {
                throw new Error('AI failed to generate a logo with this model. Please try a different prompt or model.');
            }
            return generatedLogos;
        }
    } catch (error) {
        throw handleApiError(error, "generate the logo");
    }
};


export const enhanceImageQuality = async (image: ImageData): Promise<ImageData> => {
    try {
        const result = await ai.models.generateContent({
            model: MODEL_IMAGE_EDIT,
            contents: {
                parts: [
                    fileToGenerativePart(image),
                    { text: 'Upscale this image to a higher resolution, significantly enhancing its quality and detail for printing. Do not alter the content, composition, or style of the image in any way.' },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const enhancedImage = extractImageFromResult(result);
        if (!enhancedImage) {
            throw new Error('AI could not enhance the image quality.');
        }
        return enhancedImage;
    } catch (error) {
        throw handleApiError(error, "enhance the image quality");
    }
};

export const generatePromptFromImage = async (image: ImageData): Promise<string> => {
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    fileToGenerativePart(image),
                    { text: 'Analyze this image and provide a detailed, descriptive, and artistic prompt that could be used to generate a similar image with an AI image generator. Focus on the subject, composition, lighting, style, colors, and mood. The prompt should be a single paragraph of text.' },
                ],
            },
        });
        return result.text;
    } catch (error) {
        throw handleApiError(error, "generate prompt from image");
    }
};

export const startChat = (): Chat => {
    const systemInstruction = `You are a helpful and creative AI assistant for the 'DesignForge' app. Your goal is to help users craft the perfect prompt for the AI image generator.
- When a user uploads an image and gives instructions, your primary goal is to synthesize their request into a single, high-quality, realistic, and detailed prompt.
- Be conversational and friendly. Ask clarifying questions if their request is ambiguous.
- When you provide the final, ready-to-use prompt, you MUST enclose it in a markdown code block like this: \`\`\`prompt\`. For example:
User: "make this cat look like an astronaut"
You: "Great idea! Here is a prompt you can use:
\`\`\`
A photorealistic portrait of a fluffy ginger cat wearing a detailed astronaut helmet, floating in the zero-gravity environment of a spaceship cockpit, with Earth visible through the window in the background.
\`\`\`"
- Do not use the markdown block for anything other than the final prompt.`;

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        },
    });
};

export const generateAdCopy = async (image: ImageData): Promise<string> => {
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    fileToGenerativePart(image),
                    { text: 'You are a world-class marketing expert. Analyze the provided image and generate three short, catchy, and persuasive ad copy options for a social media campaign. Each option should have a headline and a body. Present the output in a clean, readable format. Do not use markdown formatting.' },
                ],
            },
        });
        return result.text;
    } catch (error) {
        throw handleApiError(error, "generate ad copy");
    }
};

export const remixImage = async (baseImage: ImageData, sourceImage: ImageData, prompt: string, remixEngine: RemixEngine): Promise<ImageData> => {
    try {
        const engineInstruction = remixEngine === 'Artistic'
            ? `You are a creative digital artist. Re-imagine the first image (the 'base image') using artistic elements from the second image (the 'source image'), guided by the user's instruction: "${prompt}". The result should be a creative and artistic blend. Only output the final edited image.`
            : `You are an expert photo editor. Edit the first image (the 'base image') according to the user's instructions, using the second image (the 'source image') as a reference for content, style, or objects. The user's instruction is: "${prompt}". Only output the final edited image.`;

        const result = await ai.models.generateContent({
            model: MODEL_IMAGE_EDIT,
            contents: {
                parts: [
                    fileToGenerativePart(baseImage),
                    fileToGenerativePart(sourceImage),
                    { text: engineInstruction },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const remixedImage = extractImageFromResult(result);
        if (!remixedImage) {
            throw new Error('AI could not remix the images. Please try a different instruction or different images.');
        }
        return remixedImage;
    } catch (error) {
        throw handleApiError(error, "remix the images");
    }
};
