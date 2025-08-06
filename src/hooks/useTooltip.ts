// Shared tooltip management hook
import { useState, useEffect, useRef } from 'react';

export const useTooltip = (onVisibilityChange?: (visible: boolean, height: number) => void) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let height = 0;
    if (tooltipRef.current && isTooltipVisible) {
      height = tooltipRef.current.offsetHeight + 10;
    }
    setTooltipHeight(height);
    onVisibilityChange?.(isTooltipVisible, height);
  }, [isTooltipVisible, onVisibilityChange]);

  const handleMouseEnter = () => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  return {
    isTooltipVisible,
    tooltipHeight,
    tooltipRef,
    handleMouseEnter,
    handleMouseLeave,
    setIsTooltipVisible
  };
};