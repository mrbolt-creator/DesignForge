import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppState, AspectRatio, ImageData, VisualStyle, AppMode, ChatMessage, ImageGenerationModel } from './types';
import { ASPECT_RATIOS } from './constants';
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

const App: React.FC = () => {
    // General State
    const [appMode, setAppMode] = useState<AppMode>('poster');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [finalPosters, setFinalPosters] = useState<ImageData[]>([]);

    // Poster Forge State
    const [appState, setAppState] = useState<AppState>(AppState.UPLOADING_PRODUCT);
    const [productImage, setProductImage] = useState<ImageData | null>(null);
    const [processedProductImage, setProcessedProductImage] = useState<ImageData | null>(null);
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
    const [imageGenModel, setImageGenModel] = useState<ImageGenerationModel>('Imagen 4.0');
    const [generatedImages, setGeneratedImages] = useState<ImageData[] | null>(null);
    const [imageGenVariations, setImageGenVariations] = useState<number>(1);

    // AI Assistant State
    const [assistantImage, setAssistantImage] = useState<ImageData | null>(null);
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatIsLoading, setChatIsLoading] = useState(false);
    const [assistantGeneratedImage, setAssistantGeneratedImage] = useState<ImageData | null>(null);


    useEffect(() => {
        if (appMode === 'assistant' && !chatSession) {
            setChatSession(geminiService.startChat());
            setChatHistory([]);
        }
    }, [appMode, chatSession]);

    const handleProductImageUpload = useCallback(async (image: ImageData) => {
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
    }, []);

    const handleGeneratePoster = useCallback(async () => {
        if (!processedProductImage || !conceptPrompt) {
            setError('Please provide a product image and a concept.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage(`Forging ${posterVariations} poster(s) with AI...`);
        setError(null);
        setAppState(AppState.GENERATING_POSTER);
        try {
            const posters = await geminiService.generatePoster(processedProductImage, conceptPrompt, aspectRatio, selectedStyle, referenceImage, posterVariations);
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
    }, [processedProductImage, conceptPrompt, aspectRatio, selectedStyle, referenceImage, posterVariations]);
    
    const handleEditPoster = useCallback(async (prompt: string) => {
        if (!currentPosters || currentPosters.length === 0) {
            setError('There is no poster to edit.');
            return;
        }
        if (!prompt.trim() && selectedStyle === 'None') {
            setError('Please provide an edit instruction or select a different style to apply.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Applying your creative edits...');
        setError(null);
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
    }, [currentPosters, selectedStyle, selectedPosterIndex]);

    const handleGenerateImage = useCallback(async () => {
        if (!imageGenPrompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage(`Generating ${imageGenVariations} image(s) with AI...`);
        setError(null);
        try {
            const images = await geminiService.generateImage(imageGenPrompt, imageGenAspectRatio, imageGenStyle, imageGenModel, imageGenVariations);
            setGeneratedImages(images);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [imageGenPrompt, imageGenAspectRatio, imageGenStyle, imageGenModel, imageGenVariations]);

    const handleEnhanceAndDownload = useCallback(async (imageToEnhance: ImageData) => {
        setIsLoading(true);
        setLoadingMessage('Enhancing image to high quality...');
        setError(null);
        try {
            const enhancedImage = await geminiService.enhanceImageQuality(imageToEnhance);
            
            const link = document.createElement('a');
            link.href = `data:${enhancedImage.mimeType};base64,${enhancedImage.base64}`;
            link.download = `poster-forge-hd-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleGeneratePromptFromImage = useCallback(async () => {
        if (!assistantImage) {
            setError('Please upload an image first.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Analyzing image and generating prompt...');
        setError(null);
        setGeneratedPrompt('');
        try {
            const prompt = await geminiService.generatePromptFromImage(assistantImage);
            setGeneratedPrompt(prompt);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [assistantImage]);

    const handleGenerateImageInAssistant = useCallback(async (prompt: string) => {
        if (!prompt.trim()) {
            setError('Cannot generate image from an empty prompt.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Generating your image with AI...');
        setError(null);
        setAssistantGeneratedImage(null); // Clear previous image
        try {
            // Use default settings for quick generation
            const images = await geminiService.generateImage(prompt, '1:1', 'None', 'Imagen 4.0', 1);
            if (images.length > 0) {
              setAssistantGeneratedImage(images[0]);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSendChatMessage = useCallback(async (message: string, image?: ImageData) => {
        if (!chatSession) return;

        const userMessage: ChatMessage = { role: 'user', parts: [] };
        if (message.trim()) {
            userMessage.parts.push({ text: message });
        }
        if (image) {
            userMessage.parts.push({ image });
        }
        if(userMessage.parts.length === 0) return;

        setChatHistory(prev => [...prev, userMessage]);
        setChatIsLoading(true);
        setError(null);

        try {
            const messageParts = [];
            if (image) {
                messageParts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
            }
            if (message.trim()) {
                messageParts.push({ text: message });
            }
            
            const result = await chatSession.sendMessage({ message: messageParts });
            const modelResponse: ChatMessage = { role: 'model', parts: [{ text: result.text }] };
            setChatHistory(prev => [...prev, modelResponse]);
        } catch (e: any) {
            if (e.message && (e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('limit'))) {
                setError("You've reached the daily chat limit with the assistant. Please try again tomorrow.");
            } else {
                setError('The AI assistant is currently unavailable. Please try again later.');
            }
            console.error(e);
        } finally {
            setChatIsLoading(false);
        }

    }, [chatSession]);

    const handleUsePrompt = (prompt: string) => {
        setAppMode('image');
        setImageGenPrompt(prompt);
        setGeneratedImages(null); // Clear previous image
    };
    
    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Optional: show a toast notification
    };

    const handleStartOver = () => {
        setAppState(AppState.UPLOADING_PRODUCT);
        setProductImage(null);
        setProcessedProductImage(null);
        setConceptPrompt('');
        setEditPrompt('');
        setReferenceImage(null);
        setCurrentPosters(null);
        setError(null);
        setSelectedStyle('None');
    };

    const handleCloseCanvasImage = () => {
        if (appMode === 'poster') {
            setCurrentPosters(null);
            // Revert to the step where they can generate a poster again.
            setAppState(AppState.PROVIDING_CONCEPT); 
        } else if (appMode === 'image') {
            setGeneratedImages(null);
        } else if (appMode === 'assistant') {
            setAssistantGeneratedImage(null);
        }
    };
    
    const isGenerating = useMemo(() => isLoading, [isLoading]);

    const getModeButtonClass = (mode: AppMode) => {
        return `flex-1 py-3 px-2 text-center font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm ${
            appMode === mode
                ? 'bg-zinc-800/50 text-lime-400 border-b-2 border-lime-400'
                : 'bg-transparent text-zinc-500 hover:bg-zinc-800/50'
        }`;
    };

    const sectionHeaderClass = "text-lg sm:text-xl font-bold text-lime-400 mb-4 flex items-center gap-3";
    const primaryButtonClass = "mt-4 w-full bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-500/20";


    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <header className="w-full max-w-7xl mb-8 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wider">
                    Design<span className="text-lime-400">Forge</span>
                </h1>
                <p className="text-zinc-400 mt-3 text-sm">Your Vision, Perfectly Crafted</p>
            </header>

            <main className="w-full max-w-7xl flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Controls */}
                <div className="lg:col-span-1 w-full bg-zinc-900 rounded-2xl p-6 border border-lime-500/20 shadow-2xl shadow-lime-900/50 flex flex-col">
                    <div className="flex border-b border-lime-500/20 mb-6 -mx-6 -mt-6 rounded-t-2xl overflow-hidden">
                        <button onClick={() => setAppMode('poster')} className={getModeButtonClass('poster')}>
                            <Icon name="template" /> Poster
                        </button>
                        <button onClick={() => setAppMode('image')} className={getModeButtonClass('image')}>
                            <Icon name="photograph" /> Generator
                        </button>
                         <button onClick={() => setAppMode('assistant')} className={getModeButtonClass('assistant')}>
                            <Icon name="assistant" /> Assistant
                        </button>
                    </div>

                    {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg text-sm mb-4">{error}</div>}
                    
                    {appMode === 'poster' && (
                        <div className="space-y-6">
                            {appState === AppState.UPLOADING_PRODUCT && (
                                <div className="animate-fade-in">
                                    <h2 className={sectionHeaderClass}><Icon name="upload" /> Step 1: Upload Product Image</h2>
                                    <ImageUploader onImageUpload={handleProductImageUpload} label="Click or drag to upload your product photo" />
                                </div>
                            )}

                            {appState >= AppState.PROVIDING_CONCEPT && processedProductImage && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-lg font-semibold text-zinc-300">Product Image</h2>
                                        <button onClick={handleStartOver} className="text-sm text-lime-400 hover:text-lime-300 transition">Start Over</button>
                                    </div>
                                
                                    <img src={`data:${processedProductImage.mimeType};base64,${processedProductImage.base64}`} alt="Processed Product" className="rounded-lg border-2 border-zinc-700" />
                                </div>
                            )}
                            
                            {appState === AppState.PROVIDING_CONCEPT && (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <h2 className={sectionHeaderClass}><Icon name="ratio" /> Step 2: Select Aspect Ratio</h2>
                                        <AspectRatioSelector selected={aspectRatio} onSelect={setAspectRatio} />
                                    </div>
                                    <div>
                                        <h2 className={sectionHeaderClass}><Icon name="brush" /> Step 3: Choose a Style</h2>
                                        <StyleSelector selected={selectedStyle} onSelect={setSelectedStyle} />
                                    </div>
                                    <div>
                                        <h2 className={sectionHeaderClass}><Icon name="lightbulb" /> Step 4: Describe Your Vision</h2>
                                        <PromptInput onPromptSubmit={() => {}} prompt={conceptPrompt} setPrompt={setConceptPrompt} placeholder="e.g., A futuristic city skyline at dusk, neon lights reflecting..." isStandalone={true}/>
                                        <div className="mt-4">
                                            <ImageUploader onImageUpload={setReferenceImage} label="Optional: Upload a reference image" compact={true} />
                                            {referenceImage && <p className="text-xs text-lime-400 mt-2">Reference image loaded.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className={sectionHeaderClass}><Icon name="gallery" /> Step 5: Number of Variations</h2>
                                        <VariationSelector selected={posterVariations} onSelect={setPosterVariations} />
                                    </div>
                                    <div>
                                        <button onClick={handleGeneratePoster} disabled={isGenerating || !conceptPrompt} className={primaryButtonClass}>
                                            Forge Poster
                                        </button>
                                    </div>
                                </div>
                            )}

                            {appState === AppState.EDITING && (
                                <div className="animate-fade-in space-y-4">
                                    <div>
                                        <h2 className={`${sectionHeaderClass} !mb-1`}><Icon name="edit" /> Step 6: Refine Your Poster</h2>
                                        <p className="text-sm text-zinc-400 mb-4">Suggest changes, add elements, or alter the mood. Edits apply to the selected variation.</p>
                                        <div>
                                            <label className="text-sm font-semibold text-zinc-400 block mb-2">Visual Style</label>
                                            <StyleSelector selected={selectedStyle} onSelect={setSelectedStyle} />
                                        </div>
                                        <PromptInput onPromptSubmit={handleEditPoster} prompt={editPrompt} setPrompt={setEditPrompt} placeholder="e.g., Change the background to a beach, add a lens flare..." buttonText="Refine" isButtonDisabled={isLoading || (!editPrompt.trim() && selectedStyle === 'None')} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {appMode === 'image' && (
                         <div className="space-y-6 animate-fade-in">
                             <div>
                                <h2 className={sectionHeaderClass}><Icon name="assistant" /> Step 1: Select Model</h2>
                                <ModelSelector selected={imageGenModel} onSelect={setImageGenModel} />
                            </div>
                            <div>
                                <h2 className={`${sectionHeaderClass} ${imageGenModel === 'Gemini Nano (Free)' ? 'text-zinc-500' : ''}`}><Icon name="ratio" /> Step 2: Select Aspect Ratio</h2>
                                <AspectRatioSelector 
                                    selected={imageGenAspectRatio} 
                                    onSelect={setImageGenAspectRatio} 
                                    disabled={imageGenModel === 'Gemini Nano (Free)'}
                                />
                                { imageGenModel === 'Gemini Nano (Free)' && <p className="text-xs text-zinc-500 mt-2">Aspect ratio is not supported by this model.</p> }
                            </div>
                            <div>
                                <h2 className={sectionHeaderClass}><Icon name="brush" /> Step 3: Choose a Style</h2>
                                <StyleSelector selected={imageGenStyle} onSelect={setImageGenStyle} />
                            </div>
                             <div>
                                <h2 className={sectionHeaderClass}><Icon name="lightbulb" /> Step 4: Describe Your Image</h2>
                                <PromptInput
                                    onPromptSubmit={() => {}}
                                    prompt={imageGenPrompt}
                                    setPrompt={setImageGenPrompt}
                                    placeholder="e.g., A photorealistic cat wearing sunglasses on a vibrant beach"
                                    isStandalone={true}
                                />
                             </div>
                             <div>
                                <h2 className={sectionHeaderClass}><Icon name="gallery" /> Step 5: Number of Variations</h2>
                                <VariationSelector selected={imageGenVariations} onSelect={setImageGenVariations} />
                            </div>
                            <div>
                                <button onClick={handleGenerateImage} disabled={isGenerating || !imageGenPrompt.trim()} className={primaryButtonClass}>
                                    Generate Image
                                </button>
                            </div>
                        </div>
                    )}

                    {appMode === 'assistant' && (
                        <div className="space-y-6 animate-fade-in flex flex-col flex-1 min-h-0">
                            <div className="space-y-4">
                                <h2 className={sectionHeaderClass}><Icon name="photograph" /> Image to Prompt</h2>
                                {assistantImage && (
                                    <img src={`data:${assistantImage.mimeType};base64,${assistantImage.base64}`} alt="Uploaded for prompt generation" className="rounded-lg border-2 border-zinc-700 max-h-40 w-full object-contain" />
                                )}
                                <ImageUploader onImageUpload={setAssistantImage} label={assistantImage ? "Upload a different image" : "Upload an image"} compact={true} />
                                <button onClick={handleGeneratePromptFromImage} disabled={isGenerating || !assistantImage} className="w-full bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-lg transition-all duration-300">
                                    Generate Prompt
                                </button>
                                {generatedPrompt && (
                                    <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                                        <p className="text-sm text-zinc-300">{generatedPrompt}</p>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleCopyToClipboard(generatedPrompt)} className="flex-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 py-1 px-2 rounded-md transition flex items-center justify-center gap-1"><Icon name="clipboard" className="w-4 h-4" /> Copy</button>
                                            <button onClick={() => handleUsePrompt(generatedPrompt)} className="flex-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold py-1 px-2 rounded-md transition">Use Prompt</button>
                                            <button onClick={() => handleGenerateImageInAssistant(generatedPrompt)} className="flex-1 text-xs bg-lime-600 hover:bg-lime-500 text-black font-semibold py-1 px-2 rounded-md transition">Generate Image</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-lime-500/20 pt-4 flex flex-col flex-1 min-h-0">
                                <h2 className={sectionHeaderClass}><Icon name="chat" /> Chat with AI Assistant</h2>
                                <ChatInterface
                                    history={chatHistory}
                                    onSendMessage={handleSendChatMessage}
                                    isLoading={chatIsLoading}
                                    onUsePrompt={handleUsePrompt}
                                    onCopyToClipboard={handleCopyToClipboard}
                                    onGenerateImage={handleGenerateImageInAssistant}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Canvas */}
                <div className="lg:col-span-2 w-full bg-black/30 rounded-2xl p-6 border border-lime-500/20 flex items-center justify-center min-h-[60vh]">
                    {isGenerating ? (
                        <Loader message={loadingMessage} />
                    ) : (appMode === 'image' && generatedImages) ? (
                        <PosterCanvas posters={generatedImages} onAddToPanel={img => setFinalPosters(prev => [...prev, img])} onEnhanceAndDownload={handleEnhanceAndDownload} onClose={handleCloseCanvasImage} />
                    ) : (appMode === 'poster' && currentPosters) ? (
                        <PosterCanvas posters={currentPosters} onAddToPanel={img => setFinalPosters(prev => [...prev, img])} onEnhanceAndDownload={handleEnhanceAndDownload} onClose={handleCloseCanvasImage} selectedIndex={selectedPosterIndex} onSelectIndex={setSelectedPosterIndex} />
                    ) : (appMode === 'assistant' && assistantGeneratedImage) ? (
                        <PosterCanvas posters={[assistantGeneratedImage]} onAddToPanel={img => setFinalPosters(prev => [...prev, img])} onEnhanceAndDownload={handleEnhanceAndDownload} onClose={handleCloseCanvasImage} />
                    ) : (
                        <div className="text-center text-zinc-600">
                           <Icon name={appMode === 'assistant' ? 'assistant' : appMode === 'image' ? 'photograph' : 'art'} className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 text-zinc-700" />
                           <p className="text-xl font-semibold">
                                {appMode === 'assistant' ? 'Your AI Creative Partner' : appMode === 'image' ? 'Your generated image will appear here' : 'Your creative poster will appear here'}
                           </p>
                           <p className="text-zinc-500">
                               {appMode === 'assistant' ? 'Use the tools on the left to generate prompts' : appMode === 'image' ? 'Describe the image you want to create' : 'Follow the steps on the left to begin'}
                           </p>
                        </div>
                    )}
                </div>
            </main>
            
            <GeneratedImagePanel images={finalPosters} onEnhanceAndDownload={handleEnhanceAndDownload} />
        </div>
    );
};

export default App;