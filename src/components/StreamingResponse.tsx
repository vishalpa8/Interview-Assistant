import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StreamingResponseProps {
  isStreaming: boolean;
  onStreamingComplete?: (finalText: string) => void;
  onStreamingError?: (error: string) => void;
  className?: string;
}

interface StreamingState {
  currentText: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

const StreamingResponse: React.FC<StreamingResponseProps> = ({
  isStreaming,
  onStreamingComplete,
  onStreamingError,
  className = ""
}) => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    currentText: '',
    isComplete: false,
    hasError: false
  });

  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const isStreamingRef = useRef(false);

  // Reset streaming state when starting new stream
  useEffect(() => {
    if (isStreaming && !isStreamingRef.current) {
      setStreamingState({
        currentText: '',
        isComplete: false,
        hasError: false
      });
      isStreamingRef.current = true;
      lastUpdateRef.current = Date.now();
    }
  }, [isStreaming]);

  // Set up streaming event listeners
  useEffect(() => {
    const handleStreamingChunk = (partialText: string) => {
      if (!isStreamingRef.current) return;
      
      lastUpdateRef.current = Date.now();
      
      setStreamingState(prev => ({
        ...prev,
        currentText: partialText,
        isComplete: false,
        hasError: false
      }));

      // Reset timeout for detecting stream completion
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }

      // Set timeout to detect when streaming has stopped with intelligent checking
      streamingTimeoutRef.current = setTimeout(() => {
        if (isStreamingRef.current && Date.now() - lastUpdateRef.current > 2000) {
          // Check if response seems complete
          const trimmedText = partialText.trim();
          const seemsComplete = /[.!?]$|```$|\n\n$/.test(trimmedText) || 
                               trimmedText.length > 100;
          
          if (seemsComplete) {
            handleStreamingComplete(partialText);
          }
          // If not complete, extend timeout
          else {
            streamingTimeoutRef.current = setTimeout(() => {
              handleStreamingComplete(partialText);
            }, 3000);
          }
        }
      }, 2000);
    };

    const handleStreamingComplete = (finalText: string) => {
      if (!isStreamingRef.current) return;
      
      isStreamingRef.current = false;
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }

      setStreamingState(prev => ({
        ...prev,
        currentText: finalText,
        isComplete: true,
        hasError: false
      }));

      onStreamingComplete?.(finalText);
    };

    const handleStreamingError = (error: string) => {
      if (!isStreamingRef.current) return;
      
      isStreamingRef.current = false;
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }

      setStreamingState(prev => ({
        ...prev,
        isComplete: true,
        hasError: true,
        errorMessage: error
      }));

      onStreamingError?.(error);
    };

    // Set up event listeners
    const cleanupStreamingResponse = window.electronAPI.onStreamingResponse(handleStreamingChunk);
    const cleanupStreamingComplete = window.electronAPI.onStreamingComplete(handleStreamingComplete);
    const cleanupStreamingError = window.electronAPI.onStreamingError(handleStreamingError);

    return () => {
      cleanupStreamingResponse();
      cleanupStreamingComplete();
      cleanupStreamingError();
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [onStreamingComplete, onStreamingError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStreamingRef.current = false;
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  if (streamingState.hasError) {
    return (
      <div className={`${className} p-4 bg-red-900/20 border border-red-500/30 rounded-lg`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span className="text-sm font-medium">Streaming Error</span>
        </div>
        <p className="text-sm text-red-300">{streamingState.errorMessage}</p>
      </div>
    );
  }

  if (!streamingState.currentText && isStreaming) {
    return (
      <div className={`${className} p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg`}>
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm text-blue-400 font-medium">Initializing response...</span>
        </div>
      </div>
    );
  }

  if (!streamingState.currentText) {
    return null;
  }

  return (
    <div className={`${className} relative`}>
      {/* Streaming indicator */}
      {isStreaming && !streamingState.isComplete && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-2 bg-green-900/80 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-medium">Streaming...</span>
          </div>
        </div>
      )}

      {/* Completion indicator */}
      {streamingState.isComplete && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-2 bg-gray-900/80 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-400 font-medium">Complete</span>
          </div>
        </div>
      )}

      {/* Markdown content with live rendering */}
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
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
                      fontSize: '0.875rem'
                    }}
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
              <ul className="list-disc list-inside text-gray-200 mb-3 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }: any) => (
              <ol className="list-decimal list-inside text-gray-200 mb-3 space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }: any) => (
              <li className="text-gray-200">
                {children}
              </li>
            ),
            blockquote: ({ children }: any) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4">
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
            )
          }}
        >
          {streamingState.currentText}
        </ReactMarkdown>
      </div>

      {/* Cursor indicator for active streaming */}
      {isStreaming && !streamingState.isComplete && (
        <div className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></div>
      )}
    </div>
  );
};

export default StreamingResponse;