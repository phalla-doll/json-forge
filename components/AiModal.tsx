import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export const AiModal: React.FC<AiModalProps> = ({ isOpen, onClose, onGenerate, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-background border border-accents-2 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-accents-2 bg-accents-1">
          <div className="flex items-center gap-2 text-accents-8 font-semibold">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3>Generate JSON with AI</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-accents-4 hover:text-accents-8 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-accents-5 mb-2">
              Describe the data you need
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a list of 5 users with names, emails, and realistic addresses..."
              className="w-full h-32 px-3 py-2 bg-background border border-accents-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm resize-none placeholder:text-accents-3"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={!prompt.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white border-transparent"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
