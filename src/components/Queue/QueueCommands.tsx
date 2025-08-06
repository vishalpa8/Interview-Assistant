import React, { useState, useEffect, useRef } from "react";
import { IoLogOutOutline } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { HiVolumeUp } from "react-icons/hi";

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

  useEffect(() => {
    let tooltipHeight = 0;
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10;
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight);
  }, [isTooltipVisible]);

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
              setAudioResult("Audio analysis failed.");
            }
          };
          reader.readAsDataURL(blob);
        };
        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        setAudioResult("Could not start recording.");
      }
    } else {
      // Stop recording
      mediaRecorder?.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <div className="pt-2 w-fit">
      <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
        {/* Listen/Voice Recording - Now first position */}
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

        {/* Screenshot */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] leading-none truncate flex items-center gap-1">
            Screenshot
            <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
              Ctrl
            </span>
            <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
              H
            </span>
          </span>
        </div>

        {/* Solve Command */}
        {screenshots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] leading-none">Solve</span>
          </div>
        )}

        {/* Toggle - Moved before question mark */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] leading-none flex items-center gap-1">
            Toggle
            <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
              Ctrl
            </span>
            <span className="bg-white/20 px-1 py-0.5 rounded text-[10px] font-medium">
              B
            </span>
          </span>
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
                    
                    {/* Toggle Command */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">Toggle Window</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                            Ctrl
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
                            Ctrl
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
                            Ctrl
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
                            Ctrl
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
                            Ctrl
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
