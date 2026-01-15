
import React, { useState, useRef } from 'react';
import { Send, MapPin, Image as ImageIcon, Wand2, Loader2, Download } from 'lucide-react';
import { chatWithMaps, editImage, generateImage } from '../services/geminiService';
import { ImageSize } from '../types';
import type { Message } from '../types';

const GeminiTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'maps' | 'image-gen' | 'image-edit'>('maps');
  
  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('maps')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'maps' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Asistente de Ruta
        </button>
        <button
          onClick={() => setActiveTab('image-edit')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'image-edit' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          Editor (Flash)
        </button>
        <button
          onClick={() => setActiveTab('image-gen')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'image-gen' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Generador (Pro)
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'maps' && <MapsChat />}
        {activeTab === 'image-edit' && <ImageEditor />}
        {activeTab === 'image-gen' && <ImageGenerator />}
      </div>
    </div>
  );
};

// --- Sub-component: Maps Chat (Gemini 2.5 Flash + Google Maps) ---
const MapsChat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithMaps(userMsg.text, []);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date(),
        sources: response.sources
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Lo siento, hubo un error al consultar el mapa.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Pregunta sobre rutas, estado del tráfico o lugares cercanos.</p>
            <p className="text-xs mt-2">Usando Google Maps Grounding</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200/50">
                  <p className="text-xs opacity-70 mb-1 font-semibold">Fuentes:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, i) => (
                      <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-white/50 hover:bg-white/80 px-2 py-1 rounded transition-colors text-blue-700 underline truncate max-w-full block">
                        {src.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-slate-400 text-sm ml-4 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Consultando mapas...</div>}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ej: ¿Hay gasolineras cerca de la ruta 40?"
            className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Sub-component: Image Editor (Gemini 2.5 Flash Image) ---
const ImageEditor = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setResultImage('');
    }
  };

  const handleEdit = async () => {
    if (!selectedFile || !prompt) return;
    setLoading(true);
    try {
      // Assuming editImage returns a base64 string or url
      const result = await editImage(selectedFile, prompt);
      if (result) {
        setResultImage(result);
      } else {
        alert("La edición no generó una imagen nueva, el modelo podría haber respondido solo con texto (Ver consola).");
      }
    } catch (e) {
      alert("Error al editar imagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors relative">
        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded shadow-sm" />
        ) : (
          <div className="text-slate-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p>Sube una foto del incidente o vehículo</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Instrucción de Edición (Gemini 2.5 Flash)</label>
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='Ej: "Agrega un filtro de visión nocturna" o "Resalta el daño"'
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleEdit}
            disabled={loading || !selectedFile || !prompt}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Editar
          </button>
        </div>
      </div>

      {resultImage && (
        <div className="bg-slate-900 rounded-xl p-2 animate-in zoom-in duration-300">
          <p className="text-white text-xs mb-2 text-center">Resultado</p>
          <img src={resultImage} alt="Edited" className="w-full rounded-lg" />
          <a href={resultImage} download="edited_image.png" className="block w-full text-center mt-2 bg-white/10 text-white py-2 rounded hover:bg-white/20 text-sm transition-colors">
            Descargar Imagen
          </a>
        </div>
      )}
    </div>
  );
};

// --- Sub-component: Image Generator (Gemini 3 Pro Image) ---
const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [generatedImage, setGeneratedImage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const result = await generateImage(prompt, size);
      setGeneratedImage(result);
    } catch (e) {
      alert("Error generando imagen. Verifica tu API Key o cuota.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
       <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 mb-4">
        <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
          <Wand2 className="w-4 h-4" />
          Generación Pro
        </h4>
        <p className="text-xs text-purple-600 mt-1">Crea material visual de alta fidelidad para reportes de seguridad o entrenamiento.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción de la Imagen</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ej: Un poster de seguridad mostrando el uso correcto del cinturón en camiones mineros, estilo fotorrealista."
            className="w-full h-24 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Calidad (Resolución)</label>
          <div className="flex gap-2">
            {[ImageSize.SIZE_1K, ImageSize.SIZE_2K, ImageSize.SIZE_4K].map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                  size === s 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold shadow-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
          Generar Imagen
        </button>
      </div>

      {generatedImage && (
        <div className="mt-6 animate-in slide-in-from-bottom-5 duration-500">
          <div className="relative group rounded-xl overflow-hidden shadow-xl border border-slate-200">
            <img src={generatedImage} alt="Generated" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <a href={generatedImage} download="generated_safety_poster.png" className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors">
                <Download className="w-4 h-4" />
                Descargar {size}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiTools;

