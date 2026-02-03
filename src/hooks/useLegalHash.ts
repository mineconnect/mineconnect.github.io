import { useState } from 'react';

export const useLegalHash = () => {
    const [isGenerating, setIsGenerating] = useState(false);

    const generateHash = async (data: object): Promise<string> => {
        setIsGenerating(true);
        try {
            const msgBuffer = new TextEncoder().encode(JSON.stringify(data));
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (e) {
            console.error("Error generating hash", e);
            return "ERROR_HASH_GENERATION";
        } finally {
            setIsGenerating(false);
        }
    };

    return { generateHash, isGenerating };
};
