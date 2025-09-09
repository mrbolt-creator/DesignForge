import { GoogleGenAI, Modality, Chat } from "@google/genai";
import { ImageData, VisualStyle, AspectRatio, ImageGenerationModel } from '../types';
import { MODEL_IMAGE_EDIT } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const handleApiError = (error: any, context: string): Error => {
    console.error(`Error during ${context}:`, error);
    if (error && error.message && (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit'))) {
        return new Error("Failed to call the Gemini API, quota exceeded: you have reached the daily limit of requests for this model. Please select a different model, or try again tomorrow.");
    }
    const specificMessage = `Failed to ${context}. An unexpected error occurred.`;
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
                    { text: 'Isolate the main product in this image and make the background transparent. Do not add any shadows or reflections.' },
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
): Promise<ImageData[]> => {
    try {
        const styleInstruction = style !== 'None' ? `The overall visual style must be ${style}.` : '';
        const dimensions = getDimensionsForAspectRatio(aspectRatio);
        const dimensionInstruction = dimensions
            ? `The poster's dimensions must be exactly ${dimensions} (a ${aspectRatio} aspect ratio).`
            : `The poster's aspect ratio must be exactly ${aspectRatio}.`;

        const parts = [
            fileToGenerativePart(productImage),
            { text: `Create a futuristic, visually stunning, and catchy product poster featuring the provided product.
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
): Promise<ImageData[]> => {
    try {
        const styleInstruction = style !== 'None' ? `${style} style. ` : '';
        const fullPrompt = `${styleInstruction}${prompt}`;

        if (model === 'Imagen 4.0') {
            const result = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fullPrompt,
                config: {
                    numberOfImages: numberOfVariations,
                    outputMimeType: 'image/png',
                    aspectRatio: aspectRatio,
                },
            });
            
            if (!result.generatedImages || result.generatedImages.length === 0) {
                throw new Error('AI failed to generate an image. Please try a different prompt.');
            }
    
            return result.generatedImages.map(img => ({
                base64: img.image.imageBytes,
                mimeType: 'image/png',
            }));
        } else { // 'Gemini Nano (Free)'
             const generationPromises = Array.from({ length: numberOfVariations }).map(() => 
                ai.models.generateContent({
                    model: MODEL_IMAGE_EDIT, // 'gemini-2.5-flash-image-preview'
                    contents: {
                        parts: [
                            { text: fullPrompt },
                        ],
                    },
                    config: {
                        responseModalities: [Modality.IMAGE, Modality.TEXT],
                    },
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
