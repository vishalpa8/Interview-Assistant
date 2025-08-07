import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StreamingSolutionProps {
  isActive: boolean;
  onComplete?: (finalText: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

const StreamingSolution: React.FC<StreamingSolutionProps> = ({
  isActive,
  onComplete,
  onError,
  className = ""
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentLine, setCurrentLine] = useState('');
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const isActiveRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when becoming active
  useEffect(() => {
    if (isActive && !isActiveRef.current) {
      setDisplayText('');
      setIsTyping(false);
      setHasError(false);
      setErrorMessage('');
      setCurrentLine('');
      setCompletedLines([]);
      isActiveRef.current = true;
    } else if (!isActive) {
      isActiveRef.current = false;
      setIsTyping(false);
    }
  }, [isActive]);

  // Set up streaming event listeners
  useEffect(() => {
    const handleStreamingChunk = (partialText: string) => {
      if (!isActiveRef.current) return;
      
      console.log('[StreamingSolution] Received chunk:', partialText.substring(0, 100) + '...');
      
      // Process line by line for better markdown rendering
      const lines = partialText.split('\n');
      const newCompletedLines = lines.slice(0, -1); // All but last line
      const newCurrentLine = lines[lines.length - 1]; // Last line (potentially incomplete)
      
      setCompletedLines(newCompletedLines);
      setCurrentLine(newCurrentLine);
      setDisplayText(partialText);
      setIsTyping(true);
      setHasError(false);
      
      // Reset timeout for completion detection
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set timeout to detect completion with intelligent checking
      timeoutRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          // Check if the response seems complete (3-4 lines)
          const trimmedText = partialText.trim();
          const lineCount = trimmedText.split('\n').length;
          const hasNaturalEnding = /[.!?]$|```$/.test(trimmedText);
          const seemsComplete = (lineCount >= 3 && hasNaturalEnding) || 
                               trimmedText.length > 150; // Reasonable length for 3-4 lines
          
          if (seemsComplete) {
            setIsTyping(false);
            onComplete?.(partialText);
          }
          // If not complete, extend timeout
          else {
            timeoutRef.current = setTimeout(() => {
              setIsTyping(false);
              onComplete?.(partialText);
            }, 3000);
          }
        }
      }, 1500); // Initial 1.5 second check for short responses
    };

    const handleStreamingComplete = (finalText: string) => {
      if (!isActiveRef.current) return;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Process final text into lines
      const lines = finalText.split('\n');
      setCompletedLines(lines);
      setCurrentLine('');
      setDisplayText(finalText);
      setIsTyping(false);
      onComplete?.(finalText);
    };

    const handleStreamingError = (error: string) => {
      if (!isActiveRef.current) return;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      setIsTyping(false);
      setHasError(true);
      setErrorMessage(error);
      onError?.(error);
    };

    // Set up event listeners
    const cleanupStreamingResponse = window.electronAPI.onStreamingResponse(handleStreamingChunk);
    const cleanupStreamingComplete = window.electronAPI.onStreamingComplete(handleStreamingComplete);
    const cleanupStreamingError = window.electronAPI.onStreamingError(handleStreamingError);

    return () => {
      cleanupStreamingResponse();
      cleanupStreamingComplete();
      cleanupStreamingError();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onComplete, onError]);

  if (hasError) {
    return (
      <div className={`${className} p-4 bg-red-900/20 border border-red-500/30 rounded-lg`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span className="text-sm font-medium">Streaming Error</span>
        </div>
        <p className="text-sm text-red-300">{errorMessage}</p>
      </div>
    );
  }

  if (isActive && !displayText && !isTyping) {
    return (
      <div className={`${className} p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg`}>
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm text-blue-400 font-medium">Waiting for response...</span>
        </div>
      </div>
    );
  }

  if (!displayText) {
    return null;
  }

  return (
    <div className={`${className} relative`}>
      {/* Streaming indicator */}
      {isTyping && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-2 bg-green-900/80 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-medium">Streaming...</span>
          </div>
        </div>
      )}

      {/* Completion indicator */}
      {!isTyping && displayText && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-2 bg-gray-900/80 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-400 font-medium">Complete</span>
          </div>
        </div>
      )}



      {/* Markdown content with line-by-line rendering */}
      <div className="prose prose-invert max-w-none">
        {/* Render completed lines */}
        {completedLines.map((line, index) => (
          <div key={index} className="mb-1">
            <ReactMarkdown
              skipHtml={false}
              components={{
            code({ inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              
              if (!inline && language) {
                return (
                  <SyntaxHighlighter
                    style={dracula as any}
                    language={language}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      maxWidth: '100%',
                      overflow: 'auto'
                    }}
                    wrapLongLines={true}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              }
              
              return (
                <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            },
            h1: ({ children }: any) => (
              <h1 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
                {children}
              </h1>
            ),
            h2: ({ children }: any) => (
              <h2 className="text-lg font-semibold text-white mb-3 mt-6">
                {children}
              </h2>
            ),
            h3: ({ children }: any) => (
              <h3 className="text-base font-medium text-white mb-2 mt-4">
                {children}
              </h3>
            ),
            p: ({ children }: any) => (
              <p className="text-gray-200 mb-3 leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }: any) => (
              <ul className="list-disc list-inside text-gray-200 mb-3 space-y-1 ml-4">
                {children}
              </ul>
            ),
            ol: ({ children }: any) => (
              <ol className="list-decimal list-inside text-gray-200 mb-3 space-y-1 ml-4">
                {children}
              </ol>
            ),
            li: ({ children }: any) => (
              <li className="text-gray-200">
                {children}
              </li>
            ),
            blockquote: ({ children }: any) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4 bg-blue-900/10 py-2 rounded-r">
                {children}
              </blockquote>
            ),
            strong: ({ children }: any) => (
              <strong className="font-semibold text-white">
                {children}
              </strong>
            ),
            em: ({ children }: any) => (
              <em className="italic text-gray-300">
                {children}
              </em>
            ),
            table: ({ children }: any) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-600 rounded-lg">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }: any) => (
              <thead className="bg-gray-800">
                {children}
              </thead>
            ),
            tbody: ({ children }: any) => (
              <tbody className="bg-gray-900">
                {children}
              </tbody>
            ),
            tr: ({ children }: any) => (
              <tr className="border-b border-gray-600">
                {children}
              </tr>
            ),
            th: ({ children }: any) => (
              <th className="px-4 py-2 text-left text-white font-medium">
                {children}
              </th>
            ),
            td: ({ children }: any) => (
              <td className="px-4 py-2 text-gray-200">
                {children}
              </td>
            )
          }}
            >
              {line}
            </ReactMarkdown>
          </div>
        ))}
        
        {/* Render current line being typed */}
        {currentLine && (
          <div className="mb-1">
            <ReactMarkdown
              skipHtml={false}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  if (!inline && language) {
                    return (
                      <SyntaxHighlighter
                        style={dracula as any}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          maxWidth: '100%',
                          overflow: 'auto'
                        }}
                        wrapLongLines={true}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  }
                  
                  return (
                    <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }: any) => (
                  <p className="text-gray-200 mb-3 leading-relaxed">
                    {children}
                  </p>
                ),
                strong: ({ children }: any) => (
                  <strong className="font-semibold text-white">
                    {children}
                  </strong>
                )
              }}
            >
              {currentLine}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Fallback for no content */}
        {!completedLines.length && !currentLine && (
          <div className="text-gray-400 italic">No content to display</div>
        )}
      </div>

      {/* Cursor indicator for active streaming */}
      {isTyping && (
        <div className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1 mt-2"></div>
      )}
    </div>
  );
};

export default StreamingSolution;