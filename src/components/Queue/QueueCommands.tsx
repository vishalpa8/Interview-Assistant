import React, { useState, useEffect, useRef } from "react";
import { IoLogOutOutline } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

import { BiSend } from "react-icons/bi";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { BsCamera, BsGear } from "react-icons/bs";
import { MdPlayArrow } from "react-icons/md";
import { useOSDetection } from "../../utils/osDetection";
import { createAudioError, createAudioResult } from "../../utils/audioUtils";
import { ERROR_MESSAGES } from "../../utils/errorMessages";

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void;
  screenshots: Array<{ path: string; preview: string }>;
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshots,
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioResult, setAudioResult] = useState<string | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [showAskInput, setShowAskInput] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askResult, setAskResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentOS, getOSKey, getModifierText } = useOSDetection();
  
  // Reset function to clear all results
  const resetAllResults = () => {
    setAudioResult(null);
    setAskResult(null);
    setShowAskInput(false);
    setAskQuestion("");
    setIsProcessing(false);
  };
  const [isAsking, setIsAsking] = useState(false);
  const askInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let tooltipHeight = 0;
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10;
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight);
  }, [isTooltipVisible]);

  // Listen for events
  useEffect(() => {

    const cleanupFunctions = [
      // Listen for reset events
      window.electronAPI.onResetView(() => {
        resetAllResults();
      }),
      
      // Listen for screenshot processing events
      window.electronAPI.onScreenshotTaken(() => {
        setIsProcessing(true);
        // Simulate processing time
        setTimeout(() => {
          setIsProcessing(false);
        }, 2000);
      }),
      
      // Listen for solution processing events
      window.electronAPI.onSolutionStart(() => {
        setIsProcessing(true);
      }),
      
      window.electronAPI.onSolutionSuccess(() => {
        setIsProcessing(false);
      }),
      
      window.electronAPI.onSolutionError(() => {
        setIsProcessing(false);
      })
    ];
    
    return () => cleanupFunctions.forEach(cleanup => cleanup());
  }, []);

  const handleMouseEnter = () => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  const handleRecordClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.current.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, {
            type: chunks.current[0]?.type || "audio/webm",
          });
          chunks.current = [];
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(",")[1];
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(
                base64Data,
                blob.type
              );
              setAudioResult(result.text);
            } catch (err) {
              setAudioResult(ERROR_MESSAGES.AUDIO_ANALYSIS_FAILED);
            }
          };
          reader.readAsDataURL(blob);
        };
        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        setAudioResult(ERROR_MESSAGES.AUDIO_RECORDING_FAILED);
      }
    } else {
      // Stop recording
      mediaRecorder?.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleAskClick = () => {
    setShowAskInput(true);
    setAskResult(null);
    setTimeout(() => {
      askInputRef.current?.focus();
    }, 100);
  };

  const handleAskSubmit = async () => {
    if (!askQuestion.trim() || isAsking) return;
    
    setIsAsking(true);
    try {
      const result = await window.electronAPI.askQuestion(askQuestion);
      if (result.success && result.answer) {
        setAskResult(result.answer.text);
      } else {
        setAskResult(result.error || "Failed to get answer");
      }
    } catch (error) {
      setAskResult("Error asking question");
    } finally {
      setIsAsking(false);
      setAskQuestion("");
      setShowAskInput(false);
    }
  };

  const handleAskKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAskSubmit();
    } else if (e.key === 'Escape') {
      setShowAskInput(false);
      setAskQuestion("");
    }
  };



  return (
    <div className="pt-2 w-fit">

      <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
        {/* Listen/Voice Recording - First position */}
        <div className="flex items-center gap-2">
          <button
            className={`bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-white/70 flex items-center gap-1 ${
              isRecording ? "bg-red-500/70 hover:bg-red-500/90" : ""
            }`}
            onClick={handleRecordClick}
            type="button"
            title={isRecording ? "Stop listening" : "Start listening"}
          >
            {isRecording ? (
              <>
                <FaMicrophoneSlash className="w-3 h-3" />
                <span className="animate-pulse">Stop</span>
              </>
            ) : (
              <>
                <FaMicrophone className="w-3 h-3" />
                <span>Listen</span>
              </>
            )}
          </button>
        </div>

        {/* Ask Button - Second position */}
        <div className="flex items-center gap-2">
          <button
            className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-white/70 flex items-center gap-1"
            onClick={handleAskClick}
            type="button"
            title="Ask any question"
          >
            <AiOutlineQuestionCircle className="w-3 h-3" />
            <span>Ask</span>
          </button>
        </div>

        {/* Screenshot */}
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-1">
              <BsCamera className="w-3 h-3 animate-pulse text-blue-400" />
              <span className="text-[11px] leading-none text-blue-400 animate-pulse">
                Processing...
              </span>
            </div>
          ) : (
            <button
              className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-white/70 flex items-center gap-1"
              onClick={() => window.electronAPI.takeScreenshot()}
              type="button"
              title="Take screenshot"
            >
              <BsCamera className="w-3 h-3" />
              <span>Screenshot</span>
              <div className="flex gap-0.5 ml-1">
                <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
                  {getOSKey('Ctrl')}
                </span>
                <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
                  H
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Solve Command */}
        {screenshots.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              className="bg-green-500/20 hover:bg-green-500/30 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-green-400 flex items-center gap-1"
              onClick={() => {
                // Directly trigger solve functionality via IPC
                if (screenshots.length > 0) {
                  window.electronAPI.solutionStart?.();
                }
              }}
              type="button"
              title="Solve problem"
              disabled={isProcessing}
            >
              <MdPlayArrow className="w-3 h-3" />
              <span>{isProcessing ? 'Solving...' : 'Solve'}</span>
              <div className="flex gap-0.5 ml-1">
                <span className="bg-green-500/20 px-1 py-0.5 rounded text-[10px] font-medium">
                  {getOSKey('Ctrl')}
                </span>
                <span className="bg-green-500/20 px-1 py-0.5 rounded text-[10px] font-medium">
                  ↵
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Toggle - Moved before question mark */}
        <div className="flex items-center gap-2">
          <button
            className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-white/70 flex items-center gap-1"
            onClick={() => {
              // Directly trigger window hide via IPC
              window.electronAPI.hideWindow?.();
            }}
            type="button"
            title="Toggle window visibility"
          >
            <BsGear className="w-3 h-3" />
            <span>Toggle</span>
            <div className="flex gap-0.5 ml-1">
              <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
                {getOSKey('Ctrl')}
              </span>
              <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
                B
              </span>
            </div>
          </button>
        </div>

        {/* Question mark with tooltip */}
        <div
          className="relative inline-block"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10">
            <span className="text-xs text-white/70">?</span>
          </div>

          {/* Tooltip Content */}
          {isTooltipVisible && (
            <div
              ref={tooltipRef}
              className="absolute top-full right-0 mt-2 w-80"
            >
              <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                <div className="space-y-4">
                  <h3 className="font-medium truncate">Keyboard Shortcuts</h3>
                  <div className="space-y-3">
                    {/* Listen */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Listen</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            Click
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Listen and record voice input to analyze problem descriptions.
                      </p>
                    </div>
                    
                    {/* Ask */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Ask Question</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            Click
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Ask any question and get AI-powered answers and suggestions.
                      </p>
                    </div>
                    
                    {/* Toggle Command */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Toggle Window</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            {getModifierText()}
                          </span>
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            B
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Show or hide this window.
                      </p>
                    </div>
                    
                    {/* Screenshot Command */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Take Screenshot</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            {getModifierText()}
                          </span>
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            H
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Take a screenshot of the problem description. The tool will extract and analyze the problem.
                      </p>
                    </div>

                    {/* Solve Command */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Solve Problem</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            {getModifierText()}
                          </span>
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            ↵
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Generate a solution based on the current problem.
                      </p>
                    </div>
                    
                    {/* Reset Command */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Reset/Clear</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            {getModifierText()}
                          </span>
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            R
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Clear all screenshots and reset to initial state.
                      </p>
                    </div>
                    
                    {/* Window Movement */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Move Window</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            {getModifierText()}
                          </span>
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            ←→↑↓
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Move window position using arrow keys.
                      </p>
                    </div>
                    
                    {/* Exit Application */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Exit Application</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            {getModifierText()}
                          </span>
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            Q
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-white/70">
                        Quit the application completely.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="mx-2 h-4 w-px bg-white/20" />

        {/* Sign Out Button - Moved to end */}
        <button
          className="text-red-500/70 hover:text-red-500/90 transition-colors hover:cursor-pointer"
          title="Sign Out"
          onClick={() => window.electronAPI.quitApp()}
        >
          <IoLogOutOutline className="w-4 h-4" />
        </button>
      </div>
      {/* Ask Input Popup */}
      {showAskInput && (
        <div className="mt-2 p-3 bg-black/80 backdrop-blur-md rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <input
              ref={askInputRef}
              type="text"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              onKeyDown={handleAskKeyPress}
              placeholder="Ask any problem you want..."
              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-white/50 focus:outline-none focus:border-white/40"
              disabled={isAsking}
            />
            <button
              onClick={handleAskSubmit}
              disabled={!askQuestion.trim() || isAsking}
              className="bg-blue-500/70 hover:bg-blue-500/90 disabled:bg-white/10 disabled:text-white/30 transition-colors rounded px-2 py-1 text-[11px] leading-none text-white flex items-center gap-1"
              title="Submit question (Enter)"
            >
              {isAsking ? (
                <span className="animate-pulse">...</span>
              ) : (
                <>
                  <BiSend className="w-3 h-3" />
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-1 text-[10px] text-white/50">
            Press Enter to submit, Escape to cancel
          </div>
        </div>
      )}

      {/* Ask Result Display */}
      {askResult && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-white text-xs max-w-md">
          <span className="font-semibold text-blue-400">Answer:</span> {askResult}
        </div>
      )}

      {/* Audio Result Display */}
      {audioResult && (
        <div className="mt-2 p-2 bg-white/10 rounded text-white text-xs max-w-md">
          <span className="font-semibold">Audio Result:</span> {audioResult}
        </div>
      )}
    </div>
  );
};

export default QueueCommands;
