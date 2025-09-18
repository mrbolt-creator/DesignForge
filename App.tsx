import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppState, AspectRatio, ImageData, VisualStyle, AppMode, ChatMessage, ImageGenerationModel, PosterEngine, RemixEngine, PosterGenerationModel } from './types';
import { ASPECT_RATIOS, POSTER_ENGINES, REMIX_ENGINES, IMAGE_GENERATION_MODELS, POSTER_GENERATION_MODELS, DAILY_GENERATION_QUOTA } from './constants';
import * as geminiService from './services/geminiService';
import { ImageUploader } from './components/ImageUploader';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { StyleSelector } from './components/StyleSelector';
import { PromptInput } from './components/PromptInput';
import { PosterCanvas } from './components/PosterCanvas';
import { GeneratedImagePanel } from './components/GeneratedImagePanel';
import { Loader } from './components/Loader';
import { Icon } from './components/Icon';
import { ChatInterface } from './components/ChatInterface';
import { Chat } from '@google/genai';
import { ModelSelector } from './components/ModelSelector';
import { VariationSelector } from './components/VariationSelector';
import { Logo } from './components/Logo';
import { EngineSelector } from './components/EngineSelector';
import { TokenDisplay } from './components/TokenDisplay';

const App: React.FC = () => {
    // General State
    const [appMode, setAppMode] = useState<AppMode>('poster');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [finalPosters, setFinalPosters] = useState<ImageData[]>([]);
    const [adCopy, setAdCopy] = useState<string | null>(null);
    const [remainingGenerations, setRemainingGenerations] = useState<number>(DAILY_GENERATION_QUOTA);
    const FREE_MODELS: (ImageGenerationModel | PosterGenerationModel)[] = ['Gemini Nano (Free)', 'Gemini Pro (Free & Unlimited)'];

    // Poster Forge State
    const [appState, setAppState] = useState<AppState>(AppState.UPLOADING_PRODUCT);
    const [productImage, setProductImage] = useState<ImageData | null>(null);
    const [processedProductImage, setProcessedProductImage] = useState<ImageData | null>(null);
    const [posterGenModel, setPosterGenModel] = useState<PosterGenerationModel>('Gemini Nano (Free)');
    const [posterEngine, setPosterEngine] = useState<PosterEngine>('Balanced');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [selectedStyle, setSelectedStyle] = useState<VisualStyle>('None');
    const [conceptPrompt, setConceptPrompt] = useState<string>('');
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
    const [currentPosters, setCurrentPosters] = useState<ImageData[] | null>(null);
    const [posterVariations, setPosterVariations] = useState<number>(1);
    const [selectedPosterIndex, setSelectedPosterIndex] = useState<number>(0);

    // Image Generator State
    const [imageGenPrompt, setImageGenPrompt] = useState<string>('');
    const [imageGenAspectRatio, setImageGenAspectRatio] = useState<AspectRatio>('1:1');
    const [imageGenStyle, setImageGenStyle] = useState<VisualStyle>('None');
    const [imageGenModel, setImageGenModel] = useState<ImageGenerationModel>('Gemini Nano (Free)');
    const [generatedImages, setGeneratedImages] = useState<ImageData[] | null>(null);
    const [imageGenVariations, setImageGenVariations] = useState<number>(1);
    const [imageGenNegativePrompt, setImageGenNegativePrompt] = useState<string>('');
    const [imageGenSeed, setImageGenSeed] = useState<string>('');

    // AI Assistant State
    const [assistantImage, setAssistantImage] = useState<ImageData | null>(null);
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatIsLoading, setChatIsLoading] = useState(false);
    const [assistantGeneratedImage, setAssistantGeneratedImage] = useState<ImageData | null>(null);

    // Remix Mode State
    const [baseImage, setBaseImage] = useState<ImageData | null>(null);
    const [sourceImage, setSourceImage] = useState<ImageData | null>(null);
    const [remixPrompt, setRemixPrompt] = useState<string>('');
    const [remixEngine, setRemixEngine] = useState<RemixEngine>('Subtle');
    const [remixedImage, setRemixedImage] = useState<ImageData | null>(null);

    // Logo Generator State
    const [logoPrompt, setLogoPrompt] = useState<string>('');
    const [logoStyle, setLogoStyle] = useState<VisualStyle>('Minimalist');
    const [logoColors, setLogoColors] = useState<string>('');
    const [logoVariations, setLogoVariations] = useState<number>(4);
    const [generatedLogos, setGeneratedLogos] = useState<ImageData[] | null>(null);
    const [logoGenModel, setLogoGenModel] = useState<ImageGenerationModel>('Gemini Nano (Free)');


    useEffect(() => {
        if (appMode === 'assistant' && !chatSession) {
            setChatSession(geminiService.startChat());
            setChatHistory([]);
        }
    }, [appMode, chatSession]);

    useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      const storedDate = localStorage.getItem('designForgeQuotaDate');
      const storedQuota = localStorage.getItem('designForgeQuota');

      if (storedDate === today && storedQuota !== null) {
        setRemainingGenerations(parseInt(storedQuota, 10));
      } else {
        localStorage.setItem('designForgeQuotaDate', today);
        localStorage.setItem('designForgeQuota', String(DAILY_GENERATION_QUOTA));
        setRemainingGenerations(DAILY_GENERATION_QUOTA);
      }
    }, []);

    const consumeGenerations = useCallback((count: number): boolean => {
      if (remainingGenerations < count) {
        setError(`You need ${count} generation credits, but you only have ${remainingGenerations} left. Your credits will reset tomorrow.`);
        return false;
      }
      const newCount = remainingGenerations - count;
      setRemainingGenerations(newCount);
      localStorage.setItem('designForgeQuota', String(newCount));
      return true;
    }, [remainingGenerations]);

    const handleProductImageUpload = useCallback(async (image: ImageData) => {
        if (!consumeGenerations(1)) return;
        setIsLoading(true);
        setLoadingMessage('Analyzing product and removing background...');
        setError(null);
        setProductImage(image);
        setAppState(AppState.PROCESSING_PRODUCT);
        try {
            const processedImage = await geminiService.removeBackground(image);
            setProcessedProductImage(processedImage);
            setAppState(AppState.PROVIDING_CONCEPT);
        } catch (e: any) {
            setError(e.message);
            setAppState(AppState.UPLOADING_PRODUCT);
        } finally {
            setIsLoading(false);
        }
    }, [consumeGenerations]);

    const handleGeneratePoster = useCallback(async () => {
        if (!processedProductImage || !conceptPrompt) {
            setError('Please provide a product image and a concept.');
            return;
        }
        if (!FREE_MODELS.includes(posterGenModel) && !consumeGenerations(posterVariations)) return;
        setIsLoading(true);
        setLoadingMessage(`Forging ${posterVariations} poster(s) with AI...`);
        setError(null);
        setAdCopy(null);
        setGeneratedImages(null);
        setRemixedImage(null);
        setAssistantGeneratedImage(null);
        setGeneratedLogos(null);
        setAppState(AppState.GENERATING_POSTER);
        try {
            const posters = await geminiService.generatePoster(processedProductImage, conceptPrompt, aspectRatio, selectedStyle, referenceImage, posterVariations, posterEngine, posterGenModel);
            setCurrentPosters(posters);
            setSelectedPosterIndex(0);
            setAppState(AppState.EDITING);
            setSelectedStyle('None');
            setEditPrompt('');
        } catch (e: any)
{
            setError(e.message);
            setAppState(AppState.PROVIDING_CONCEPT);
        } finally {
            setIsLoading(false);
        }
    }, [processedProductImage, conceptPrompt, aspectRatio, selectedStyle, referenceImage, posterVariations, posterEngine, posterGenModel, consumeGenerations, FREE_MODELS]);
    
    const handleEditPoster = useCallback(async (prompt: string) => {
        if (!currentPosters || currentPosters.length === 0) {
            setError('There is no poster to edit.');
            return;
        }
        if (!prompt.trim() && selectedStyle === 'None') {
            setError('Please provide an edit instruction or select a different style to apply.');
            return;
        }
        if (!consumeGenerations(1)) return;
        setIsLoading(true);
        setLoadingMessage('Applying your creative edits...');
        setError(null);
        setAdCopy(null);
        try {
            const imageToEdit = currentPosters[selectedPosterIndex];
            const editedPoster = await geminiService.editPoster(imageToEdit, prompt, selectedStyle);
            const newPosters = [...currentPosters];
            newPosters[selectedPosterIndex] = editedPoster;
            setCurrentPosters(newPosters);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [currentPosters, selectedStyle, selectedPosterIndex, consumeGenerations]);

    const handleGenerateImage = useCallback(async () => {
        if (!imageGenPrompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        if (!FREE_MODELS.includes(imageGenModel) && !consumeGenerations(imageGenVariations)) return;
        setIsLoading(true);
        setLoadingMessage(`Generating ${imageGenVariations} image(s) with AI...`);
        setError(null);
        setAdCopy(null);
        setCurrentPosters(null);
        setRemixedImage(null);
        setAssistantGeneratedImage(null);
        setGeneratedLogos(null);
        try {
            const seedValue = imageGenSeed.trim() ? parseInt(imageGenSeed, 10) : undefined;
            const seed = seedValue && !isNaN(seedValue) ? seedValue : undefined;
            const images = await geminiService.generateImage(imageGenPrompt, imageGenAspectRatio, imageGenStyle, imageGenModel, imageGenVariations, imageGenNegativePrompt, seed);
            setGeneratedImages(images);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [imageGenPrompt, imageGenAspectRatio, imageGenStyle, imageGenModel, imageGenVariations, imageGenNegativePrompt, imageGenSeed, consumeGenerations, FREE_MODELS]);

    const handleGenerateLogo = useCallback(async () => {
        if (!logoPrompt.trim()) {
            setError('Please describe the logo you want to create.');
            return;
        }
        if (!FREE_MODELS.includes(logoGenModel) && !consumeGenerations(logoVariations)) return;
        setIsLoading(true);
        setLoadingMessage(`Generating ${logoVariations} logo concepts...`);
        setError(null);
        setAdCopy(null);
        setCurrentPosters(null);
        setGeneratedImages(null);
        setRemixedImage(null);
        setAssistantGeneratedImage(null);
        try {
            const logos = await geminiService.generateLogo(logoPrompt, logoStyle, logoColors, logoVariations, logoGenModel);
            setGeneratedLogos(logos);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [logoPrompt, logoStyle, logoColors, logoVariations, logoGenModel, consumeGenerations, FREE_MODELS]);

    const handleEnhanceAndDownload = useCallback(async (imageToEnhance: ImageData) => {
        if (!consumeGenerations(1)) return;
        setIsLoading(true);
        setLoadingMessage('Enhancing image to high quality...');
        setError(null);
        try {
            const enhancedImage = await geminiService.enhanceImageQuality(imageToEnhance);
            
            const link = document.createElement('a');
            link.href = `data:${enhancedImage.mimeType};base64,${enhancedImage.base64}`;
            link.download = `design-forge-hd-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [consumeGenerations]);

    const handleGeneratePromptFromImage = useCallback(async () => {
        if (!assistantImage) {
            setError('Please upload an image first.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Analyzing your image...');
        setError(null);
        try {
            const prompt = await geminiService.generatePromptFromImage(assistantImage);
            setGeneratedPrompt(prompt);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [assistantImage]);

    const handleSendMessage = useCallback(async (message: string, image?: ImageData) => {
        if (!chatSession) return;

        const userMessage: ChatMessage = { role: 'user', parts: [] };
        if (message.trim()) {
            userMessage.parts.push({ text: message });
        }
        if (image) {
            userMessage.parts.push({ image });
        }

        setChatHistory(prev => [...prev, userMessage]);
        setChatIsLoading(true);

        try {
            const result = await chatSession.sendMessage({ message: userMessage.parts });
            const modelMessage: ChatMessage = { role: 'model', parts: [{ text: result.text }] };
            setChatHistory(prev => [...prev, modelMessage]);
        } catch (e: any) {
            setError(e.message);
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: `Sorry, I encountered an error: ${e.message}` }] };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setChatIsLoading(false);
        }
    }, [chatSession]);

    const handleUsePromptForImageGen = useCallback((prompt: string) => {
        setAppMode('image');
        setImageGenPrompt(prompt);
        setImageGenAspectRatio('1:1');
        setImageGenStyle('None');
        setGeneratedImages(null);
    }, []);

    const handleCopyToClipboard = (prompt: string) => {
        navigator.clipboard.writeText(prompt);
    };

    const generateImageWithPrompt = useCallback(async (prompt: string) => {
         if (!prompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        if (!FREE_MODELS.includes(imageGenModel)) {
            if (!consumeGenerations(1)) return;
        }
        setIsLoading(true);
        setLoadingMessage(`Generating image with AI...`);
        setError(null);
        setAdCopy(null);
        setCurrentPosters(null);
        setRemixedImage(null);
        setGeneratedLogos(null);
        try {
            const images = await geminiService.generateImage(prompt, imageGenAspectRatio, imageGenStyle, imageGenModel, 1, '', undefined);
            setAssistantGeneratedImage(images[0]);
            setGeneratedImages(images);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [imageGenAspectRatio, imageGenStyle, imageGenModel, consumeGenerations, FREE_MODELS]);
    
    const handleGenerateImageFromAssistant = (prompt: string) => {
        setAppMode('image');
        setImageGenPrompt(prompt);
        generateImageWithPrompt(prompt);
    };

    const handleGenerateAdCopy = useCallback(async (image: ImageData) => {
        setIsLoading(true);
        setLoadingMessage('Generating creative ad copy...');
        setError(null);
        setAdCopy(null);
        try {
            const copy = await geminiService.generateAdCopy(image);
            setAdCopy(copy);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleRemixImage = useCallback(async () => {
        if (!baseImage || !sourceImage) {
            setError('Please provide both a base and a source image.');
            return;
        }
        if (!remixPrompt.trim()) {
            setError('Please provide instructions for the remix.');
            return;
        }
        if (!consumeGenerations(1)) return;
        setIsLoading(true);
        setLoadingMessage('Remixing your images with AI...');
        setError(null);
        setAdCopy(null);
        setCurrentPosters(null);
        setGeneratedImages(null);
        setAssistantGeneratedImage(null);
        setGeneratedLogos(null);
        try {
            const result = await geminiService.remixImage(baseImage, sourceImage, remixPrompt, remixEngine);
            setRemixedImage(result);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [baseImage, sourceImage, remixPrompt, remixEngine, consumeGenerations]);

    const currentPoster = useMemo(() => {
        if (currentPosters && currentPosters.length > selectedPosterIndex) {
            return currentPosters[selectedPosterIndex];
        }
        return null;
    }, [currentPosters, selectedPosterIndex]);

    const addToFinalPosters = useCallback((image: ImageData) => {
        setFinalPosters(prev => {
            if (prev.some(p => p.base64 === image.base64)) {
                return prev;
            }
            return [...prev, image];
        });
    }, []);

    const getAspectRatioClassName = (ratio: AspectRatio): string => {
        const map: Record<AspectRatio, string> = {
            '1:1': 'aspect-square',
            '9:16': 'aspect-[9/16]',
            '16:9': 'aspect-[16/9]',
            '3:4': 'aspect-[3/4]',
            '4:3': 'aspect-[4/3]',
        };
        return map[ratio] || 'aspect-square';
    };
    
    const renderStep = (stepNumber: number, title: string, children: React.ReactNode, isComplete: boolean, isCurrent: boolean) => {
        return (
            <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${isCurrent ? 'bg-zinc-800/50 border-lime-500/50' : isComplete ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-800/30 border-transparent'}`}>
                <h3 className="text-lg font-bold text-lime-400 mb-3 flex items-center gap-2">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${isCurrent || isComplete ? 'bg-lime-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>{stepNumber}</span>
                    {title}
                </h3>
                {children}
            </div>
        );
    };

    const renderLeftPanel = () => {
        switch(appMode) {
            case 'poster':
                return (
                    <div className="flex flex-col gap-4">
                        {renderStep(1, 'Upload Product',
                            <ImageUploader onImageUpload={handleProductImageUpload} label="Upload or Drag Product Image" />,
                            appState !== AppState.UPLOADING_PRODUCT,
                            appState === AppState.UPLOADING_PRODUCT
                        )}

                        {appState !== AppState.UPLOADING_PRODUCT && renderStep(2, 'Craft Your Vision',
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">AI Model</label>
                                    <ModelSelector models={POSTER_GENERATION_MODELS} selected={posterGenModel} onSelect={(model) => setPosterGenModel(model)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Generation Engine</label>
                                    <EngineSelector engines={POSTER_ENGINES} selected={posterEngine} onSelect={(engine) => setPosterEngine(engine)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Aspect Ratio</label>
                                    <AspectRatioSelector selected={aspectRatio} onSelect={(ratio) => setAspectRatio(ratio)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Visual Style</label>
                                    <StyleSelector selected={selectedStyle} onSelect={(style) => setSelectedStyle(style)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Variations</label>
                                    <VariationSelector selected={posterVariations} onSelect={(v) => setPosterVariations(v)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Style Reference (Optional)</label>
                                    <ImageUploader onImageUpload={setReferenceImage} label="Upload Style Image" compact={true} />
                                    {referenceImage && <img src={`data:${referenceImage.mimeType};base64,${referenceImage.base64}`} alt="Reference" className="mt-2 rounded-md h-20 w-20 object-cover" />}
                                </div>
                                <PromptInput
                                    onPromptSubmit={() => handleGeneratePoster()}
                                    placeholder="e.g., floating on a cloud, surrounded by neon lights..."
                                    buttonText="Forge Poster"
                                    prompt={conceptPrompt}
                                    setPrompt={setConceptPrompt}
                                    isButtonDisabled={!conceptPrompt.trim() || (!FREE_MODELS.includes(posterGenModel) && remainingGenerations < posterVariations)}
                                />
                            </div>,
                            appState === AppState.GENERATING_POSTER || appState === AppState.EDITING,
                            appState === AppState.PROVIDING_CONCEPT
                        )}
                        
                        {appState === AppState.EDITING && currentPoster && renderStep(3, 'Refine & Edit',
                             <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">
                                        Editing Variation {selectedPosterIndex + 1}
                                    </label>
                                    <img 
                                        src={`data:${currentPoster.mimeType};base64,${currentPoster.base64}`} 
                                        alt={`Editing variation ${selectedPosterIndex + 1}`}
                                        className={`w-full rounded-lg border-2 border-zinc-700 object-cover ${getAspectRatioClassName(aspectRatio)}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Apply Visual Style</label>
                                    <StyleSelector selected={selectedStyle} onSelect={(style) => setSelectedStyle(style)} />
                                </div>
                                <PromptInput
                                    onPromptSubmit={handleEditPoster}
                                    placeholder="e.g., make it brighter, add a lens flare"
                                    buttonText="Apply Edits"
                                    isStandalone={true}
                                    prompt={editPrompt}
                                    setPrompt={setEditPrompt}
                                    isButtonDisabled={(!editPrompt.trim() && selectedStyle === 'None') || remainingGenerations < 1}
                                />
                             </div>,
                             false,
                             true
                        )}
                    </div>
                );
            
            case 'image':
                return (
                    <div className="flex flex-col gap-4">
                         {renderStep(1, 'Describe Your Image',
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">AI Model</label>
                                    <ModelSelector models={IMAGE_GENERATION_MODELS} selected={imageGenModel} onSelect={(model) => setImageGenModel(model)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Aspect Ratio</label>
                                    <AspectRatioSelector selected={imageGenAspectRatio} onSelect={(ratio) => setImageGenAspectRatio(ratio)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Visual Style</label>
                                    <StyleSelector selected={imageGenStyle} onSelect={(style) => setImageGenStyle(style)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Variations</label>
                                    <VariationSelector selected={imageGenVariations} onSelect={(v) => setImageGenVariations(v)} />
                                </div>
                                <div>
                                    <label htmlFor="negative-prompt" className="text-sm font-semibold text-zinc-300 mb-2 block">Negative Prompt (what to avoid)</label>
                                    <textarea
                                        id="negative-prompt"
                                        value={imageGenNegativePrompt}
                                        onChange={(e) => setImageGenNegativePrompt(e.target.value)}
                                        placeholder="e.g., text, watermarks, ugly, blurry..."
                                        rows={2}
                                        className="w-full p-3 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="seed-input" className="text-sm font-semibold text-zinc-300 mb-2 block">Seed (for consistent results)</label>
                                    <input
                                        id="seed-input"
                                        type="text"
                                        value={imageGenSeed}
                                        onChange={(e) => setImageGenSeed(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="Enter a number or leave blank"
                                        className="w-full p-3 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition"
                                    />
                                </div>
                                <PromptInput
                                    onPromptSubmit={() => handleGenerateImage()}
                                    placeholder="A photorealistic image of a futuristic city at sunset..."
                                    buttonText="Generate Image"
                                    prompt={imageGenPrompt}
                                    setPrompt={setImageGenPrompt}
                                    isButtonDisabled={!imageGenPrompt.trim() || (!FREE_MODELS.includes(imageGenModel) && remainingGenerations < imageGenVariations)}
                                />
                            </div>,
                            !!generatedImages,
                            !generatedImages
                        )}
                    </div>
                );

            case 'logo':
                return (
                    <div className="flex flex-col gap-4">
                        {renderStep(1, 'Design Your Logo',
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">AI Model</label>
                                    <ModelSelector models={IMAGE_GENERATION_MODELS} selected={logoGenModel} onSelect={(model) => setLogoGenModel(model)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Visual Style</label>
                                    <StyleSelector selected={logoStyle} onSelect={(style) => setLogoStyle(style)} />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Variations</label>
                                    <VariationSelector selected={logoVariations} onSelect={(v) => setLogoVariations(v)} />
                                </div>
                                <PromptInput
                                    onPromptSubmit={() => {}}
                                    placeholder="e.g., A powerful eagle for a tech company"
                                    prompt={logoPrompt}
                                    setPrompt={setLogoPrompt}
                                    isStandalone={true}
                                />
                                <PromptInput
                                    onPromptSubmit={() => handleGenerateLogo()}
                                    placeholder="e.g., Deep blue, electric green, silver"
                                    buttonText="Generate Logos"
                                    prompt={logoColors}
                                    setPrompt={setLogoColors}
                                    isButtonDisabled={!logoPrompt.trim() || (!FREE_MODELS.includes(logoGenModel) && remainingGenerations < logoVariations)}
                                    rows={2}
                                />
                            </div>,
                            !!generatedLogos,
                            !generatedLogos
                        )}
                    </div>
                );

            case 'assistant':
                return (
                    <div className="flex flex-col h-full gap-4">
                        {/* Section 1: Image to Prompt */}
                        <div className="p-4 rounded-lg border-2 bg-zinc-800/30 border-zinc-700">
                            <h3 className="text-lg font-bold text-lime-400 mb-3 flex items-center gap-2">
                                <Icon name="lightbulb" className="w-5 h-5" />
                                Get Prompt from Image
                            </h3>
                            <ImageUploader onImageUpload={(img) => {
                                setAssistantImage(img);
                                setGeneratedPrompt(''); // Clear old prompt on new image upload
                            }} label="Upload Image" compact={true} />

                            {assistantImage && (
                                <div className="mt-4 text-center">
                                    <img src={`data:${assistantImage.mimeType};base64,${assistantImage.base64}`} alt="Assistant upload preview" className="rounded-lg w-full mb-3" />
                                    <button 
                                        onClick={handleGeneratePromptFromImage} 
                                        disabled={isLoading}
                                        className="w-full bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-wait text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        <Icon name="assistant" className="w-5 h-5"/>
                                        Generate Prompt
                                    </button>
                                </div>
                            )}
                            
                            {generatedPrompt && (
                                <div className="mt-4 p-3 bg-zinc-900 rounded-lg border border-lime-500/30">
                                    <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">{generatedPrompt}</p>
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-700">
                                        <button onClick={() => handleCopyToClipboard(generatedPrompt)} className="flex-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5">
                                            <Icon name="clipboard" className="w-4 h-4" /> Copy
                                        </button>
                                        <button onClick={() => handleUsePromptForImageGen(generatedPrompt)} className="flex-1 text-xs bg-lime-600 hover:bg-lime-500 text-black font-semibold py-1.5 px-2 rounded-md transition">
                                            Use Prompt
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Chat Assistant */}
                        <div className="flex flex-col flex-1 min-h-0">
                            <h3 className="text-lg font-bold text-lime-400 mb-2 flex items-center gap-2 px-1">
                                <Icon name="chat" className="w-5 h-5" />
                                Chat with Assistant
                            </h3>
                            <p className="text-sm text-zinc-400 mb-3 px-1">Or, refine your ideas conversationally.</p>
                            <div className="flex-1 min-h-0">
                                <ChatInterface 
                                    history={chatHistory} 
                                    isLoading={chatIsLoading} 
                                    onSendMessage={handleSendMessage}
                                    onUsePrompt={handleUsePromptForImageGen}
                                    onCopyToClipboard={handleCopyToClipboard}
                                    onGenerateImage={handleGenerateImageFromAssistant}
                                />
                            </div>
                        </div>
                    </div>
                );
            
            case 'remix':
                return (
                    <div className="flex flex-col gap-4">
                        {renderStep(1, 'Base Image',
                            <ImageUploader onImageUpload={setBaseImage} label="Upload Base Image" />,
                            !!baseImage,
                            !baseImage
                        )}
                        {baseImage && renderStep(2, 'Source Image',
                            <ImageUploader onImageUpload={setSourceImage} label="Upload Style/Content Source" />,
                            !!sourceImage,
                            !sourceImage
                        )}
                        {baseImage && sourceImage && renderStep(3, 'Remix Instructions',
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Remix Engine</label>
                                    <EngineSelector engines={REMIX_ENGINES} selected={remixEngine} onSelect={(engine) => setRemixEngine(engine)} />
                                </div>
                                <PromptInput
                                    onPromptSubmit={handleRemixImage}
                                    placeholder="e.g., Turn the person into a robot, using the style of the second image."
                                    buttonText="Remix Images"
                                    prompt={remixPrompt}
                                    setPrompt={setRemixPrompt}
                                    isButtonDisabled={!remixPrompt.trim() || remainingGenerations < 1}
                                />
                            </div>,
                            !!remixedImage,
                            !remixedImage
                        )}
                    </div>
                );

            default:
                return null;
        }
    };
    
    const renderCanvas = () => {
        if (isLoading) {
            return <Loader message={loadingMessage} />;
        }
        
        const mainContent = (() => {
            switch(appMode) {
                case 'poster':
                    if (appState === AppState.EDITING && currentPosters) {
                        return <PosterCanvas 
                                    posters={currentPosters}
                                    onAddToPanel={addToFinalPosters} 
                                    onEnhanceAndDownload={handleEnhanceAndDownload} 
                                    selectedIndex={selectedPosterIndex}
                                    onSelectIndex={setSelectedPosterIndex}
                                    onGenerateAdCopy={handleGenerateAdCopy}
                                    adCopy={adCopy}
                                    onClearAdCopy={() => setAdCopy(null)}
                                    remainingGenerations={remainingGenerations}
                                />;
                    }
                    if (appState === AppState.PROVIDING_CONCEPT && processedProductImage) {
                         return (
                            <div className="w-full h-full flex items-center justify-center p-4">
                                <div className="text-center">
                                    <img src={`data:${processedProductImage.mimeType};base64,${processedProductImage.base64}`} alt="Processed Product" className="max-w-full max-h-[60vh] mx-auto rounded-lg shadow-2xl shadow-black/50" />
                                    <p className="mt-4 text-zinc-400">Background removed. Ready for a concept!</p>
                                </div>
                            </div>
                        );
                    }
                    if (appState === AppState.UPLOADING_PRODUCT || appState === AppState.PROCESSING_PRODUCT) {
                         return (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                <Icon name="template" className="w-24 h-24 text-zinc-700 mb-4"/>
                                <h2 className="text-2xl font-bold text-zinc-300">Welcome to Poster Forge</h2>
                                <p className="text-zinc-500 max-w-md">Start by uploading a product image. The AI will remove the background, allowing you to create stunning marketing visuals.</p>
                            </div>
                        );
                    }
                    return null;
                
                case 'image':
                    if (generatedImages) {
                         return <PosterCanvas 
                                    posters={generatedImages}
                                    onAddToPanel={addToFinalPosters} 
                                    onEnhanceAndDownload={handleEnhanceAndDownload} 
                                    onGenerateAdCopy={handleGenerateAdCopy}
                                    adCopy={adCopy}
                                    onClearAdCopy={() => setAdCopy(null)}
                                    onClose={() => setGeneratedImages(null)}
                                    remainingGenerations={remainingGenerations}
                                />;
                    }
                    return (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                            <Icon name="photograph" className="w-24 h-24 text-zinc-700 mb-4"/>
                            <h2 className="text-2xl font-bold text-zinc-300">Image Generator</h2>
                            <p className="text-zinc-500 max-w-md">Describe any scene, object, or character, and watch the AI bring your words to life. Select your model and style to begin.</p>
                        </div>
                    );

                case 'logo':
                    if (generatedLogos) {
                        return <PosterCanvas
                                    posters={generatedLogos}
                                    onAddToPanel={addToFinalPosters}
                                    onEnhanceAndDownload={handleEnhanceAndDownload}
                                    onClose={() => setGeneratedLogos(null)}
                                    remainingGenerations={remainingGenerations}
                                />
                    }
                     return (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                            <Icon name="logo" className="w-24 h-24 text-zinc-700 mb-4"/>
                            <h2 className="text-2xl font-bold text-zinc-300">Logo Generator</h2>
                            <p className="text-zinc-500 max-w-md">Create a professional vector-style logo for your brand. Describe your concept, choose a style, and let the AI do the rest.</p>
                        </div>
                    );

                case 'assistant':
                    if (assistantGeneratedImage) {
                         return <PosterCanvas 
                                    posters={[assistantGeneratedImage]}
                                    onAddToPanel={addToFinalPosters} 
                                    onEnhanceAndDownload={handleEnhanceAndDownload}
                                    onClose={() => setAssistantGeneratedImage(null)}
                                    remainingGenerations={remainingGenerations}
                                />;
                    }
                    return (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                            <Icon name="assistant" className="w-24 h-24 text-zinc-700 mb-4"/>
                            <h2 className="text-2xl font-bold text-zinc-300">AI Prompt Assistant</h2>
                            <p className="text-zinc-500 max-w-md">Stuck for ideas? Chat with the AI, upload reference images, and collaborate to create the perfect prompt for your next masterpiece.</p>
                        </div>
                    );
                
                case 'remix':
                     if (remixedImage) {
                         return <PosterCanvas 
                                    posters={[remixedImage]}
                                    onAddToPanel={addToFinalPosters} 
                                    onEnhanceAndDownload={handleEnhanceAndDownload}
                                    onClose={() => setRemixedImage(null)}
                                    remainingGenerations={remainingGenerations}
                                />;
                    }
                    return (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                            <Icon name="remix" className="w-24 h-24 text-zinc-700 mb-4"/>
                            <h2 className="text-2xl font-bold text-zinc-300">Image Remix</h2>
                            <p className="text-zinc-500 max-w-md">Combine two images in creative ways. Use one as a base and another as a style or content source. Tell the AI how to blend them.</p>
                        </div>
                    );

                default:
                    return null;
            }
        })();

        return (
            <div className="relative w-full h-full bg-black/30 rounded-lg overflow-hidden border border-zinc-800">
                {mainContent}
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-800/90 text-white p-4 rounded-lg shadow-lg z-20 max-w-md w-full text-center animate-fade-in-down">
                        <p className="font-bold">An error occurred</p>
                        <p className="text-sm">{error}</p>
                        <button onClick={() => setError(null)} className="absolute top-1 right-1 p-1 text-white hover:text-red-200">
                            <Icon name="close" className="w-4 h-4"/>
                        </button>
                    </div>
                )}
            </div>
        );
    };
    
    const ModeButton = ({ mode, label, icon }: { mode: AppMode, label: string, icon: string }) => (
        <button
            onClick={() => setAppMode(mode)}
            className={`flex-1 p-3 rounded-lg text-sm font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-2 border-2 ${appMode === mode ? 'bg-lime-400 border-lime-400 text-black shadow-lg shadow-lime-500/20' : 'bg-zinc-800 border-transparent hover:border-lime-500'}`}
        >
            <Icon name={icon} className="w-5 h-5" />
            {label}
        </button>
    );

    return (
        <div className="h-screen w-screen bg-zinc-950 text-zinc-200 flex flex-col p-4 gap-4">
            <header className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
                <Logo />
                <TokenDisplay remaining={remainingGenerations} total={DAILY_GENERATION_QUOTA} />
            </header>

            <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
                <ModeButton mode="poster" label="Poster Forge" icon="template" />
                <ModeButton mode="image" label="Image Gen" icon="photograph" />
                <ModeButton mode="logo" label="Logo Gen" icon="logo" />
                <ModeButton mode="remix" label="Remix" icon="remix" />
                <ModeButton mode="assistant" label="AI Assistant" icon="assistant" />
            </div>

            <main className="flex-1 flex gap-4 min-h-0">
                <aside className="w-full max-w-sm flex-shrink-0 bg-zinc-900 rounded-lg p-4 overflow-y-auto">
                    {renderLeftPanel()}
                </aside>
                <section className="flex-1 min-w-0">
                   {renderCanvas()}
                </section>
            </main>
            
            <GeneratedImagePanel images={finalPosters} onEnhanceAndDownload={handleEnhanceAndDownload} remainingGenerations={remainingGenerations} />
        </div>
    );
};

export default App;