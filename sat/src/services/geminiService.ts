
import { GoogleGenAI } from "@google/genai";
import { ImageSize } from "../types";

// 1. Get API Key from Vite's environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("🚨 FATAL ERROR: VITE_GEMINI_API_KEY is missing in the .env file");
}

// 2. Initialize the Google GenAI client
const ai = new GoogleGenAI(apiKey || '');

// Helper to encode file to base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Chat with Maps Grounding
 * Uses gemini-2.5-flash with googleMaps tool
 */
export const chatWithMaps = async (
  prompt: string,
  _history: { role: string; parts: { text: string }[] }[]
): Promise<{ text: string; sources?: Array<{ uri: string; title: string }> }> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // We use generateContent for a single turn here effectively,
    // but in a real app you might use chat.sendMessage with history.
    // To keep it simple and robust with tools, we'll send the prompt directly.
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        systemInstruction: "Eres un asistente de logística y seguridad vial experto para MineConnect SAT. Ayudas a los operadores a encontrar rutas seguras, paradas de descanso y verificar condiciones geográficas. Responde siempre en Español.",
      },
    });

    const text = response.text || "No se pudo generar una respuesta.";
    
    // Extract grounding chunks if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: Array<{ uri: string; title: string }> = [];

    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title || 'Fuente Web' });
        }
        if (chunk.maps?.uri) {
           sources.push({ uri: chunk.maps.uri, title: chunk.maps.title || 'Ubicación en Maps' });
        }
      });
    }

    return { text, sources };

  } catch (error) {
    console.error("Error in chatWithMaps:", error);
    throw error;
  }
};

/**
 * Edit Image using Text Prompt
 * Uses gemini-2.5-flash-image
 */
export const editImage = async (imageFile: File, prompt: string): Promise<string> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          imagePart,
          { text: prompt }
        ]
      },
    });

    // Check for image in response
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return ""; // Return empty if no image generated (or handle as text error upstream)
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Generate High Quality Image
 * Uses gemini-3-pro-image-preview
 */
export const generateImage = async (prompt: string, size: ImageSize): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: "16:9" // Good for dashboard/web
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

