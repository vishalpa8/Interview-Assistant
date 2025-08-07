import React, { useState } from 'react';
import { IoClose, IoCopy, IoCheckmark } from 'react-icons/io5';

interface SmartResponseDisplayProps {
  response: string;
  onClose: () => void;
  isStreaming?: boolean;
}

interface CodeBlock {
  language: string;
  code: string;
  id: string;
}

interface ParsedContent {
  textParts: string[];
  codeBlocks: CodeBlock[];
}

const SmartResponseDisplay: React.FC<SmartResponseDisplayProps> = ({ response, onClose, isStreaming = false }) => {
  const [copiedBlocks, setCopiedBlocks] = useState<Set<string>>(new Set());

  // Parse response to extract code blocks and text
  const parseResponse = (text: string): ParsedContent => {
    const codeBlocks: CodeBlock[] = [];
    const textParts: string[] = [];
    
    // Split by code blocks (```language ... ```)
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    parts.forEach((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // This is a code block
        const lines = part.split('\n');
        const firstLine = lines[0].replace('```', '').trim();
        const language = firstLine || 'text';
        const code = lines.slice(1, -1).join('\n');
        
        if (code.trim()) {
          codeBlocks.push({
            language: language.charAt(0).toUpperCase() + language.slice(1),
            code: code.trim(),
            id: `code-${index}`
          });
        }
      } else if (part.trim()) {
        // This is text content
        textParts.push(part.trim());
      }
    });
    
    return { textParts, codeBlocks };
  };

  const copyToClipboard = async (text: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlocks(prev => new Set(prev).add(blockId));
      setTimeout(() => {
        setCopiedBlocks(prev => {
          const newSet = new Set(prev);
          newSet.delete(blockId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const { textParts, codeBlocks } = parseResponse(response);

  return (
    <div className="mt-2 p-3 bg-gray-900/90 backdrop-blur-md rounded-lg border border-gray-700 max-w-4xl">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-green-400 text-xs font-medium flex items-center gap-1">
          <span>🤖</span> AI Response
          {isStreaming && (
            <span className="ml-2 flex items-center gap-1 text-blue-400">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-[10px]">Streaming...</span>
            </span>
          )}
        </h4>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white/80 transition-colors"
          title="Close response"
        >
          <IoClose className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Display text parts */}
        {textParts.map((text, index) => (
          <div key={`text-${index}`} className="text-xs text-gray-100 leading-relaxed">
            {text.split('\n').map((line, lineIndex) => (
              <p key={lineIndex} className={lineIndex > 0 ? 'mt-2' : ''}>
                {line}
              </p>
            ))}
          </div>
        ))}

        {/* Display code blocks */}
        {codeBlocks.map((block) => (
          <div key={block.id} className="bg-black/50 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700">
              <span className="text-xs font-medium text-blue-400">
                {block.language}
              </span>
              <button
                onClick={() => copyToClipboard(block.code, block.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-600/50 rounded transition-colors"
                title="Copy code"
              >
                {copiedBlocks.has(block.id) ? (
                  <>
                    <IoCheckmark className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <IoCopy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3">
              <pre className="text-xs text-gray-100 font-mono leading-relaxed overflow-x-auto">
                <code>{block.code}</code>
              </pre>
            </div>
          </div>
        ))}

        {/* Fallback for responses without clear structure */}
        {textParts.length === 0 && codeBlocks.length === 0 && (
          <div className="bg-black/50 rounded p-3 border border-gray-800">
            <pre className="whitespace-pre-wrap font-mono text-xs text-gray-100 leading-relaxed overflow-x-auto">
              {response}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartResponseDisplay;