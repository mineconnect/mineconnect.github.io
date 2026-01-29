import { X } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ onClose, title, children }: ModalProps) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-slate-900 text-slate-300">
          {children}
        </div>
      </div>
    </div>
  );
};