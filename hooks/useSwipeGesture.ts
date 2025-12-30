'use client';

import { useState, useRef, useCallback } from 'react';

interface SwipeHistory {
  index: number;
  direction: 'left' | 'right';
}

interface UseSwipeGestureReturn {
  isDragging: boolean;
  isAnimating: boolean;
  dragOffset: { x: number; y: number };
  swipeDirection: 'left' | 'right' | null;
  swipeHistory: SwipeHistory[];
  startPos: React.MutableRefObject<{ x: number; y: number }>;
  setIsDragging: (dragging: boolean) => void;
  setIsAnimating: (animating: boolean) => void;
  setDragOffset: (offset: { x: number; y: number }) => void;
  setSwipeDirection: (direction: 'left' | 'right' | null) => void;
  setSwipeHistory: React.Dispatch<React.SetStateAction<SwipeHistory[]>>;
  handleDragStart: (clientX: number, clientY: number) => void;
  handleDragMove: (clientX: number, clientY: number) => { x: number; y: number };
  handleDragEnd: (threshold: number) => 'left' | 'right' | null;
  resetDrag: () => void;
}

export function useSwipeGesture(): UseSwipeGestureReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistory[]>([]);
  const startPos = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    startPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const offset = {
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y,
    };
    setDragOffset(offset);
    return offset;
  }, []);

  const handleDragEnd = useCallback((threshold: number = 100): 'left' | 'right' | null => {
    setIsDragging(false);
    
    if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      return direction;
    }
    
    // Reset if not past threshold
    setDragOffset({ x: 0, y: 0 });
    return null;
  }, [dragOffset.x]);

  const resetDrag = useCallback(() => {
    setIsDragging(false);
    setIsAnimating(false);
    setDragOffset({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, []);

  return {
    isDragging,
    isAnimating,
    dragOffset,
    swipeDirection,
    swipeHistory,
    startPos,
    setIsDragging,
    setIsAnimating,
    setDragOffset,
    setSwipeDirection,
    setSwipeHistory,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    resetDrag,
  };
}

