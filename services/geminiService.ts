/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  type Video,
} from '@google/genai';

const getAiClient = () => new GoogleGenAI({apiKey: process.env.API_KEY});

// --- Director Assistant Logic ---

export interface DirectorAction {
  type: 'GENERATE_ASSET' | 'UPDATE_PROMPT' | 'CHAT_RESPONSE' | 'SWITCH_VIEW';
  payload: any;
}

export const chatWithDirector = async (
  history: {role: 'user' | 'ai'; text: string}[],
  userMessage: string
): Promise<DirectorAction> => {
  const ai = getAiClient();
  // Using Gemini 3 Pro for superior reasoning and intent parsing
  const model = 'gemini-3-pro-preview';

  const systemInstruction = `You are an AI Film Director Assistant for "Veo Studio". 
  Your goal is to help the user build a movie. You can perform actions by returning a specific JSON structure.
  
  If the user asks to create/generate a character, object, or location image:
  Return JSON: { "type": "GENERATE_ASSET", "payload": { "prompt": "detailed visual description of the asset..." } }
  
  If the user asks to write a scene, script, or set the video prompt:
  Return JSON: { "type": "UPDATE_PROMPT", "payload": { "prompt": "optimized video generation prompt..." } }

  If the user asks to go to storyboard or studio:
  Return JSON: { "type": "SWITCH_VIEW", "payload": { "view": "storyboard" or "studio" } }
  
  Otherwise, answer their question helpfully:
  Return JSON: { "type": "CHAT_RESPONSE", "payload": { "text": "your helpful response..." } }
  
  Output ONLY valid JSON. Do not wrap in markdown code blocks.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      ...history.map(h => ({ role: h.role === 'ai' ? 'model' : 'user', parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json'
    }
  });

  try {
    const text = response.text || '{}';
    // Clean up potential markdown if the model slips up
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Director parse error", e);
    return { type: 'CHAT_RESPONSE', payload: { text: "I'm having trouble processing that request right now." } };
  }
};

// --- Storyboard Logic ---

export const generateStoryboardDescription = async (items: {prompt: string, note: string, x: number, y: number}[]): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';

  // Normalize coordinates to describe "left", "right", "center"
  const describedItems = items.map(i => {
    const hPos = i.x < 150 ? "on the left" : i.x > 300 ? "on the right" : "in the center";
    const vPos = i.y < 150 ? "in the background/top" : "in the foreground/bottom";
    return `${i.prompt} (${i.note}) located ${hPos} and ${vPos}`;
  });

  const prompt = `Create a cohesive, single-shot video generation prompt based on this storyboard layout. 
  Combine these elements into a fluid scene description.
  Elements:
  ${describedItems.join('\n')}
  
  Keep it cinematic, detailed, and under 60 words. Focus on the spatial relationships described.`;

  const response = await ai.models.generateContent({ model, contents: prompt });
  return response.text || "";
};

// --- Bin System Logic ---

export const generateScript = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview'; 
  
  const response = await ai.models.generateContent({
    model,
    contents: `You are an expert screenwriter. Refine this idea into a detailed visual description suitable for AI video generation (Veo).
    Focus on lighting, camera movement, and subject details.
    User Idea: ${prompt}`,
  });
  
  return response.text || "Could not generate script.";
};

export interface ScoreMetadata {
  title: string;
  description: string;
  bpm: string;
  instruments: string[];
}

export const generateScoreMetadata = async (mood: string): Promise<ScoreMetadata> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `Generate a musical score idea for a film scene with this mood: "${mood}".
    Return JSON with: 
    - title (creative name)
    - description (instruments, texture, feeling)
    - bpm (number as string)
    - instruments (array of strings)
    `,
    config: { responseMimeType: 'application/json' }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { title: "Untitled Score", description: mood, bpm: "120", instruments: ["Synth", "Strings"] };
  }
};

export const generateTransitionPrompts = async (prevSceneDescription: string): Promise<string[]> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `Based on the previous scene: "${prevSceneDescription}", suggest 3 B-Roll or transition shot ideas to bridge to a new scene.
    Return JSON: { "ideas": ["string1", "string2", "string3"] }`,
    config: { responseMimeType: 'application/json' }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data.ideas || [];
  } catch (e) {
    return ["Fade to black", "Pan to sky", "Focus pull on texture"];
  }
};

// --- Asset Generation ---

export const generateImage = async (prompt: string): Promise<{imageUrl: string; blob: Blob}> => {
  const ai = getAiClient();
  // Using the Pro image model as requested for "Nano Banana" equivalent or better
  const model = 'gemini-3-pro-image-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
        const base64 = part.inlineData.data;
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for(let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], {type: 'image/png'});
        const imageUrl = URL.createObjectURL(blob);
        return { imageUrl, blob };
    }
  }
  throw new Error("No image generated");
};

export const generateVideo = async (params: any) => {
    // Re-exporting or keeping the original generateVideo logic if it was here, 
    // or assuming it's imported from elsewhere. 
    // Since the original file didn't show generateVideo implementation in the snippet provided 
    // but App.tsx imports it, I will implement it here to ensure it works.
    
    const ai = getAiClient();
    let operation;

    // Check for "Extension" mode
    if (params.mode === 'Extend Video' && params.inputVideoObject) {
         operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview', // Extension only on standard veo
            prompt: params.prompt || "Continue the video",
            video: params.inputVideoObject,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: params.aspectRatio,
            }
        });
    } 
    // Check for "References" mode
    else if (params.mode === 'References to Video' && params.referenceImages?.length > 0) {
        const refs = params.referenceImages.map((img: any) => ({
             image: { imageBytes: img.base64, mimeType: img.file.type },
             referenceType: 'ASSET' // VideoGenerationReferenceType.ASSET
        }));

        operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: params.prompt,
            config: {
                numberOfVideos: 1,
                referenceImages: refs,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });
    }
    // Standard generation (Text or Image-to-Video)
    else {
        const modelName = params.model || 'veo-3.1-fast-generate-preview';
        const config: any = {
            numberOfVideos: 1,
            resolution: params.resolution,
            aspectRatio: params.aspectRatio,
        };
        
        // Add start frame if present
        if (params.startFrame) {
             // For generateVideos with image, we pass it in the main payload or as config?
             // The prompt instructions say: image: { ... }
             operation = await ai.models.generateVideos({
                model: modelName,
                prompt: params.prompt,
                image: { imageBytes: params.startFrame.base64, mimeType: params.startFrame.file.type },
                config
             });
             // Note: End frame logic is complex in current SDK examples, omitting for stability unless specified.
        } else {
             operation = await ai.models.generateVideos({
                model: modelName,
                prompt: params.prompt,
                config
             });
        }
    }

    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await videoRes.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    return { 
        objectUrl, 
        blob, 
        video: operation.response?.generatedVideos?.[0]?.video 
    };
};
