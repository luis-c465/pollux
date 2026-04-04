# Technical Research: RAF-Based Typewriter Effects for AI Text Streaming

**Research Date:** April 4, 2026

---

## Executive Summary

This document provides comprehensive technical findings on implementing high-performance typewriter/character streaming effects in React applications, specifically optimized for AI text streaming scenarios. The research covers requestAnimationFrame best practices, refresh rate detection, dynamic speed adaptation, buffer/queue patterns, and React-specific implementation patterns.

---

## 1. requestAnimationFrame (RAF) Best Practices for Text Streaming

### Key Findings

**What RAF Provides:**
- Synchronizes callbacks with the browser's repaint cycle
- Frequency matches display refresh rate (typically 60Hz, but can be 75Hz, 120Hz, 144Hz, or higher)
- Automatically pauses in background tabs/hidden iframes for performance and battery life
- Provides high-resolution timestamps via the callback parameter

**Critical Best Practices:**

1. **Always Use the Timestamp Parameter**
   - The timestamp is a `DOMHighResTimeStamp` (sub-millisecond precision)
   - Represents time elapsed since `performance.timeOrigin`
   - **Essential for consistent animation speed across different refresh rates**

2. **RAF is One-Shot**
   - Must call `requestAnimationFrame()` again inside the callback to continue
   - This is by design, not a limitation

3. **Timestamp vs performance.now()**
   - RAF timestamp represents the **end time of the previous frame's rendering**
   - Similar to calling `performance.now()` at callback start, but never identical
   - Multiple RAF callbacks in the same frame receive the **same timestamp**

### Implementation Pattern

```javascript
// ✅ CORRECT: Using timestamp for time-based animation
let startTime = null;
let animationId = null;

function animate(timestamp) {
  if (startTime === null) {
    startTime = timestamp;
  }
  
  const elapsed = timestamp - startTime;
  const progress = Math.min(elapsed / duration, 1);
  
  // Update animation based on elapsed time
  updateUI(progress);
  
  if (progress < 1) {
    animationId = requestAnimationFrame(animate);
  }
}

animationId = requestAnimationFrame(animate);

// Cleanup
return () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
};
```

**Sources:**
- [MDN: Window.requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN: High Precision Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/High_precision_timing)

---

## 2. Detecting Monitor Refresh Rate

### Methods Available

**Method 1: Calculate from RAF Timestamps (Most Reliable)**

```javascript
function detectRefreshRate() {
  return new Promise((resolve) => {
    const frameTimes = [];
    let lastTime = null;
    let frameCount = 0;
    const targetFrames = 30; // Measure 30 frames for accuracy
    
    function measure(timestamp) {
      if (lastTime !== null) {
        frameTimes.push(timestamp - lastTime);
        frameCount++;
        
        if (frameCount >= targetFrames) {
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const refreshRate = Math.round(1000 / avgFrameTime);
          resolve(refreshRate);
          return;
        }
      }
      
      lastTime = timestamp;
      requestAnimationFrame(measure);
    }
    
    requestAnimationFrame(measure);
  });
}

// Usage
const refreshRate = await detectRefreshRate();
console.log(`Monitor refresh rate: ${refreshRate}Hz`);
```

**Method 2: Use `performance.now()` for Higher Precision**

```javascript
function detectRefreshRatePrecise() {
  return new Promise((resolve) => {
    const frameTimes = [];
    let lastTime = performance.now();
    let frameCount = 0;
    const targetFrames = 60;
    
    function measure() {
      const currentTime = performance.now();
      frameTimes.push(currentTime - lastTime);
      lastTime = currentTime;
      frameCount++;
      
      if (frameCount >= targetFrames) {
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const refreshRate = Math.round(1000 / avgFrameTime);
        resolve(refreshRate);
        return;
      }
      
      requestAnimationFrame(measure);
    }
    
    requestAnimationFrame(measure);
  });
}
```

**Method 3: CSS `display-refresh-rate` Media Query (Emerging)**

```javascript
// Note: Limited browser support as of 2026
if (window.matchMedia) {
  const highRefresh = window.matchMedia('(display-refresh-rate: 120hz)');
  if (highRefresh.matches) {
    console.log('120Hz display detected');
  }
}
```

### Important Considerations

- **Variable Refresh Rate (VRR):** Modern displays may change refresh rate dynamically
- **Cross-origin isolation:** Affects timestamp precision (5μs vs 100μs)
- **Background tabs:** RAF pauses, affecting measurements
- **Recommendation:** Cache the detected refresh rate, but re-check periodically

**Sources:**
- [MDN: Performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [MDN: DOMHighResTimeStamp](https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp)

---

## 3. Dynamic Speed Typewriter Effects with "Catch-Up" Logic

### Core Concept

When streaming AI text, the buffer can grow if characters arrive faster than they're displayed. Dynamic speed adaptation prevents the UI from falling permanently behind.

### Implementation Pattern

```javascript
function useDynamicTypewriter({ 
  baseSpeed = 30,        // Characters per second at base speed
  maxSpeed = 100,        // Maximum characters per second
  catchUpThreshold = 100 // Buffer size that triggers speed increase
}) {
  const [displayedText, setDisplayedText] = useState('');
  const bufferRef = useRef('');
  const rafIdRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);
  const charsDisplayedRef = useRef(0);
  
  // Add text to buffer (call this when AI stream chunk arrives)
  const addToBuffer = useCallback((chunk) => {
    bufferRef.current += chunk;
    
    // Start RAF loop if not running
    if (!rafIdRef.current) {
      startAnimation();
    }
  }, []);
  
  const startAnimation = useCallback(() => {
    function animate(timestamp) {
      // Calculate time delta
      if (lastUpdateTimeRef.current === null) {
        lastUpdateTimeRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastUpdateTimeRef.current) / 1000; // Convert to seconds
      lastUpdateTimeRef.current = timestamp;
      
      // Calculate dynamic speed based on buffer size
      const bufferLength = bufferRef.current.length;
      let currentSpeed = baseSpeed;
      
      if (bufferLength > catchUpThreshold) {
        // Linear interpolation between base and max speed
        const excessRatio = Math.min((bufferLength - catchUpThreshold) / catchUpThreshold, 1);
        currentSpeed = baseSpeed + (maxSpeed - baseSpeed) * excessRatio;
      }
      
      // Calculate characters to display this frame
      const charsToDisplay = Math.ceil(currentSpeed * deltaTime);
      
      if (charsToDisplay > 0 && bufferRef.current.length > 0) {
        // Drain buffer
        const chunk = bufferRef.current.slice(0, charsToDisplay);
        bufferRef.current = bufferRef.current.slice(charsToDisplay);
        
        // Update state (batch updates if possible)
        setDisplayedText(prev => prev + chunk);
        charsDisplayedRef.current += charsToDisplay;
      }
      
      // Continue if buffer has content or more is expected
      if (bufferRef.current.length > 0 || isStreamingRef.current) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    }
    
    rafIdRef.current = requestAnimationFrame(animate);
  }, [baseSpeed, maxSpeed, catchUpThreshold]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  return { displayedText, addToBuffer };
}
```

### Speed Adaptation Strategies

**Strategy 1: Linear Interpolation**
```javascript
const speed = baseSpeed + (maxSpeed - baseSpeed) * Math.min(bufferSize / threshold, 1);
```

**Strategy 2: Exponential Backoff**
```javascript
const speed = baseSpeed * Math.pow(2, Math.min(bufferSize / threshold, 3));
```

**Strategy 3: Step Function**
```javascript
let speed = baseSpeed;
if (bufferSize > threshold * 2) speed = maxSpeed;
else if (bufferSize > threshold) speed = baseSpeed * 2;
```

---

## 4. Word-by-Word vs Character-by-Character: Tradeoffs

### Character-by-Character

**Pros:**
- Smoothest visual appearance
- Precise control over timing
- Better for short text or code
- Easier to implement cursor effects

**Cons:**
- More state updates (potential performance impact)
- Can feel slow for long content
- May break words awkwardly at line boundaries
- Higher React reconciliation overhead

**Best For:**
- Code snippets
- Short responses
- When visual polish is priority
- Typewriter sound effects

```javascript
// Character-by-character implementation
function CharacterTypewriter({ text, speed = 50 }) {
  const [displayed, setDisplayed] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayed(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1000 / speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);
  
  return <span>{displayed}</span>;
}
```

### Word-by-Word

**Pros:**
- Fewer state updates (better performance)
- More natural reading rhythm
- Better for long-form content
- Easier to implement syntax highlighting per word
- Reduces React re-renders

**Cons:**
- Less smooth animation
- Can feel "chunky"
- Harder to implement precise cursor positioning
- Word boundaries may not align with desired timing

**Best For:**
- Long AI responses
- Content with natural pauses
- Performance-critical applications
- When SEO/readability during streaming matters

```javascript
// Word-by-word implementation
function WordTypewriter({ text, speed = 10 }) {
  const [displayed, setDisplayed] = useState('');
  const words = useMemo(() => text.split(/(\s+)/), [text]); // Preserve whitespace
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < words.length) {
        setDisplayed(prev => prev + words[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1000 / speed);
    
    return () => clearInterval(interval);
  }, [words, speed]);
  
  return <span>{displayed}</span>;
}
```

### Hybrid Approach (Recommended for AI Streaming)

```javascript
// Stream word-by-word, but animate characters within words
function HybridTypewriter({ text, charSpeed = 50, wordPause = 100 }) {
  const [displayed, setDisplayed] = useState('');
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  
  useEffect(() => {
    if (currentWordIndex >= words.length) return;
    
    const currentWord = words[currentWordIndex];
    
    // If it's whitespace, add it immediately
    if (/^\s+$/.test(currentWord)) {
      setDisplayed(prev => prev + currentWord);
      setCurrentWordIndex(prev => prev + 1);
      return;
    }
    
    // Animate characters within the word
    if (currentCharIndex < currentWord.length) {
      const timeout = setTimeout(() => {
        setDisplayed(prev => prev + currentWord[currentCharIndex]);
        setCurrentCharIndex(prev => prev + 1);
      }, 1000 / charSpeed);
      
      return () => clearTimeout(timeout);
    } else {
      // Word complete, pause before next word
      const timeout = setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, wordPause);
      
      return () => clearTimeout(timeout);
    }
  }, [currentWordIndex, currentCharIndex, words, charSpeed, wordPause]);
  
  return <span>{displayed}</span>;
}
```

---

## 5. Typewriter Queue/Buffer Pattern

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  AI Stream      │───▶│  Input Buffer    │───▶│  RAF Drain Loop │───▶ Display
│  (chunks)       │    │  (queue)         │    │  (adaptive)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Speed Controller│
                       │  (threshold-based)│
                       └──────────────────┘
```

### Complete Implementation

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useTypewriterBuffer - Hook for managing AI text streaming with RAF
 * 
 * @param {Object} options
 * @param {number} options.baseSpeed - Characters per second at normal speed
 * @param {number} options.maxSpeed - Maximum characters per second when catching up
 * @param {number} options.catchUpThreshold - Buffer size that triggers speed increase
 * @param {number} options.batchSize - Max characters to add per frame
 */
function useTypewriterBuffer({
  baseSpeed = 30,
  maxSpeed = 100,
  catchUpThreshold = 100,
  batchSize = 10
} = {}) {
  // State
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  // Refs for mutable values that don't trigger re-renders
  const bufferRef = useRef('');
  const rafIdRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);
  const isStreamingRef = useRef(false);
  const totalCharsReceivedRef = useRef(0);
  const totalCharsDisplayedRef = useRef(0);
  
  // Add chunk from AI stream
  const addChunk = useCallback((chunk) => {
    if (!chunk) return;
    
    bufferRef.current += chunk;
    totalCharsReceivedRef.current += chunk.length;
    isStreamingRef.current = true;
    setIsComplete(false);
    
    // Start RAF loop if not already running
    if (!rafIdRef.current) {
      startDrainLoop();
    }
  }, []);
  
  // Start the RAF drain loop
  const startDrainLoop = useCallback(() => {
    function drain(timestamp) {
      // Initialize timing on first frame
      if (lastUpdateTimeRef.current === null) {
        lastUpdateTimeRef.current = timestamp;
      }
      
      // Calculate time delta in seconds
      const deltaTime = (timestamp - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = timestamp;
      
      // Calculate adaptive speed based on buffer size
      const bufferLength = bufferRef.current.length;
      let currentSpeed = calculateSpeed(bufferLength);
      
      // Calculate characters to display this frame
      const charsThisFrame = Math.min(
        Math.ceil(currentSpeed * deltaTime),
        batchSize
      );
      
      // Drain buffer if there's content
      if (charsThisFrame > 0 && bufferLength > 0) {
        const chunk = bufferRef.current.slice(0, charsThisFrame);
        bufferRef.current = bufferRef.current.slice(charsThisFrame);
        
        // Update displayed text
        setDisplayedText(prev => prev + chunk);
        totalCharsDisplayedRef.current += charsThisFrame;
      }
      
      // Determine if we should continue
      const shouldContinue = 
        bufferRef.current.length > 0 ||  // Buffer still has content
        isStreamingRef.current;          // Still receiving data
      
      if (shouldContinue) {
        rafIdRef.current = requestAnimationFrame(drain);
      } else {
        // Streaming complete and buffer empty
        rafIdRef.current = null;
        setIsComplete(true);
      }
    }
    
    rafIdRef.current = requestAnimationFrame(drain);
  }, [batchSize]);
  
  // Calculate adaptive speed
  const calculateSpeed = useCallback((bufferSize) => {
    if (bufferSize <= catchUpThreshold) {
      return baseSpeed;
    }
    
    // Linear interpolation between base and max speed
    const excessRatio = Math.min(
      (bufferSize - catchUpThreshold) / catchUpThreshold,
      1
    );
    
    return baseSpeed + (maxSpeed - baseSpeed) * excessRatio;
  }, [baseSpeed, maxSpeed, catchUpThreshold]);
  
  // Mark streaming as complete
  const markComplete = useCallback(() => {
    isStreamingRef.current = false;
    
    // If buffer is empty, mark as complete immediately
    if (bufferRef.current.length === 0 && !rafIdRef.current) {
      setIsComplete(true);
    }
  }, []);
  
  // Reset the typewriter
  const reset = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    bufferRef.current = '';
    setDisplayedText('');
    setIsComplete(false);
    isStreamingRef.current = false;
    totalCharsReceivedRef.current = 0;
    totalCharsDisplayedRef.current = 0;
    lastUpdateTimeRef.current = null;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  // Calculate progress
  const progress = totalCharsReceivedRef.current > 0
    ? totalCharsDisplayedRef.current / totalCharsReceivedRef.current
    : 0;
  
  const bufferLength = bufferRef.current.length;
  
  return {
    displayedText,
    isComplete,
    isStreaming: isStreamingRef.current,
    bufferLength,
    progress,
    addChunk,
    markComplete,
    reset
  };
}

export default useTypewriterBuffer;
```

### Usage Example

```javascript
import useTypewriterBuffer from './useTypewriterBuffer';

function AIChatResponse({ stream }) {
  const {
    displayedText,
    isComplete,
    bufferLength,
    progress,
    addChunk,
    markComplete
  } = useTypewriterBuffer({
    baseSpeed: 30,
    maxSpeed: 150,
    catchUpThreshold: 100,
    batchSize: 15
  });
  
  // Subscribe to AI stream
  useEffect(() => {
    if (!stream) return;
    
    const reader = stream.getReader();
    
    async function readStream() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            markComplete();
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          addChunk(chunk);
        }
      } catch (error) {
        console.error('Stream error:', error);
        markComplete();
      }
    }
    
    readStream();
    
    return () => {
      reader.cancel();
    };
  }, [stream, addChunk, markComplete]);
  
  return (
    <div className="ai-response">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      
      {bufferLength > 100 && (
        <div className="catching-up-indicator">
          Catching up... ({bufferLength} chars behind)
        </div>
      )}
      
      <div className="content">
        {displayedText}
        {!isComplete && <span className="cursor">▊</span>}
      </div>
    </div>
  );
}
```

---

## 6. React Patterns for Managing RAF Loops

### Pattern 1: useRef for RAF ID and Mutable State

```javascript
function useRAFLoop(callback, isActive = true) {
  const rafIdRef = useRef(null);
  const callbackRef = useRef(callback);
  
  // Keep callback current without re-running effect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!isActive) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      return;
    }
    
    let lastTime = null;
    
    function loop(timestamp) {
      if (lastTime === null) {
        lastTime = timestamp;
      }
      
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      
      // Call user callback with timing info
      callbackRef.current({ timestamp, deltaTime });
      
      rafIdRef.current = requestAnimationFrame(loop);
    }
    
    rafIdRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isActive]);
}

// Usage
function AnimatedComponent() {
  const [position, setPosition] = useState(0);
  
  useRAFLoop(({ deltaTime }) => {
    // deltaTime is in milliseconds
    setPosition(prev => prev + deltaTime * 0.1);
  }, true);
  
  return <div style={{ transform: `translateX(${position}px)` }} />;
}
```

### Pattern 2: Separation of Concerns

```javascript
// Separate RAF management from business logic
function useTypewriterEngine({ onCharacter, onComplete }) {
  const bufferRef = useRef('');
  const rafIdRef = useRef(null);
  const lastTimeRef = useRef(null);
  
  const start = useCallback(() => {
    function frame(timestamp) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      
      // Business logic here
      const chars = Math.ceil(30 * deltaTime);
      if (chars > 0 && bufferRef.current.length > 0) {
        const chunk = bufferRef.current.slice(0, chars);
        bufferRef.current = bufferRef.current.slice(chars);
        onCharacter(chunk);
      }
      
      if (bufferRef.current.length > 0) {
        rafIdRef.current = requestAnimationFrame(frame);
      } else {
        onComplete();
      }
    }
    
    rafIdRef.current = requestAnimationFrame(frame);
  }, [onCharacter, onComplete]);
  
  const addToBuffer = useCallback((text) => {
    bufferRef.current += text;
    if (!rafIdRef.current) start();
  }, [start]);
  
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);
  
  return { addToBuffer };
}
```

### Pattern 3: Custom Hook with Cleanup

```javascript
function useAnimationFrame(callback, enabled = true) {
  const requestRef = useRef();
  const previousTimeRef = useRef();
  
  const animate = useCallback((time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);
  
  useEffect(() => {
    if (enabled) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined;
    }
    
    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [enabled, animate]);
  
  // Return cancel function for manual control
  return useCallback(() => {
    cancelAnimationFrame(requestRef.current);
    previousTimeRef.current = undefined;
  }, []);
}
```

### Pattern 4: Multiple RAF Loops with Synchronization

```javascript
// For complex animations with multiple independent loops
function useSynchronizedRAF(loops) {
  const rafIdRef = useRef(null);
  const lastTimeRef = useRef(null);
  
  useEffect(() => {
    function frame(timestamp) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      // Execute all loops
      loops.forEach(loop => {
        if (loop.enabled) {
          loop.callback({ timestamp, deltaTime });
        }
      });
      
      rafIdRef.current = requestAnimationFrame(frame);
    }
    
    rafIdRef.current = requestAnimationFrame(frame);
    
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [loops]);
}
```

---

## 7. Performance Considerations for Per-Frame State Updates

### The Problem

Updating React state on every animation frame can cause:
- Excessive re-renders
- Main thread blocking
- Janky animations
- High CPU usage
- Battery drain on mobile

### Optimization Strategies

#### Strategy 1: Batch State Updates

```javascript
// ❌ BAD: State update every frame
useRAFLoop(() => {
  setCount(prev => prev + 1);
});

// ✅ BETTER: Batch updates
useRAFLoop(() => {
  frameCountRef.current++;
  
  // Only update state every N frames
  if (frameCountRef.current % 3 === 0) {
    setCount(prev => prev + frameCountRef.current);
    frameCountRef.current = 0;
  }
});
```

#### Strategy 2: Separate Animation State from Display State

```javascript
// Keep high-frequency animation in refs, sync to state less frequently
function useSmoothTypewriter() {
  const [displayedText, setDisplayedText] = useState('');
  const animationBufferRef = useRef('');
  const lastSyncRef = useRef(0);
  
  useRAFLoop(({ timestamp }) => {
    // Animation logic runs every frame (using refs)
    animationBufferRef.current += getNextCharacter();
    
    // Sync to state only every 100ms
    if (timestamp - lastSyncRef.current > 100) {
      setDisplayedText(animationBufferRef.current);
      lastSyncRef.current = timestamp;
    }
  });
  
  return displayedText;
}
```

#### Strategy 3: Use `useDeferredValue` for Non-Critical Updates

```javascript
import { useDeferredValue } from 'react';

function TypewriterDisplay({ text }) {
  // Defer non-critical re-renders
  const deferredText = useDeferredValue(text);
  
  return <div>{deferredText}</div>;
}
```

#### Strategy 4: Direct DOM Manipulation for Pure Visual Updates

```javascript
// For cursor blinking or other purely visual effects
function useCursorBlink(containerRef) {
  useEffect(() => {
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '▊';
    containerRef.current.appendChild(cursor);
    
    let visible = true;
    let rafId;
    
    function blink(timestamp) {
      if (timestamp % 1000 < 500) {
        if (!visible) {
          cursor.style.opacity = '1';
          visible = true;
        }
      } else {
        if (visible) {
          cursor.style.opacity = '0';
          visible = false;
        }
      }
      rafId = requestAnimationFrame(blink);
    }
    
    rafId = requestAnimationFrame(blink);
    
    return () => {
      cancelAnimationFrame(rafId);
      cursor.remove();
    };
  }, [containerRef]);
}
```

#### Strategy 5: Throttle State Updates

```javascript
function useThrottledState(initialValue, throttleMs = 100) {
  const [value, setValue] = useState(initialValue);
  const lastUpdateRef = useRef(0);
  const pendingValueRef = useRef(initialValue);
  const rafIdRef = useRef(null);
  
  const setThrottledValue = useCallback((newValue) => {
    pendingValueRef.current = newValue;
    
    if (rafIdRef.current) return;
    
    rafIdRef.current = requestAnimationFrame(() => {
      const now = performance.now();
      
      if (now - lastUpdateRef.current >= throttleMs) {
        setValue(pendingValueRef.current);
        lastUpdateRef.current = now;
      }
      
      rafIdRef.current = null;
      
      // Schedule next update if there's a pending value
      if (pendingValueRef.current !== value) {
        setThrottledValue(pendingValueRef.current);
      }
    });
  }, [throttleMs, value]);
  
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  return [value, setThrottledValue];
}
```

### Performance Metrics to Monitor

```javascript
// Monitor frame drops and adjust accordingly
function useFramePerformance() {
  const [frameTime, setFrameTime] = useState(0);
  const frameTimesRef = useRef([]);
  
  useRAFLoop(({ deltaTime }) => {
    frameTimesRef.current.push(deltaTime);
    
    // Keep last 60 frames
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }
    
    // Calculate average frame time
    const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / 
                frameTimesRef.current.length;
    
    setFrameTime(avg);
    
    // Log if frame time exceeds threshold
    if (avg > 20) { // More than 50 FPS
      console.warn('Frame time high:', avg);
    }
  });
  
  return { frameTime, fps: Math.round(1000 / frameTime) };
}
```

### Best Practices Summary

1. **Minimize State Updates:** Only update state when necessary for UI
2. **Use Refs for Animation State:** Keep high-frequency data in refs
3. **Batch Updates:** Group multiple changes into single state updates
4. **Throttle Visual Updates:** Limit state updates to 10-30 FPS for non-critical UI
5. **Use `useDeferredValue`:** For non-blocking updates in React 18+
6. **Profile Regularly:** Use React DevTools Profiler to identify bottlenecks
7. **Consider Web Workers:** Offload heavy computation from main thread

**Sources:**
- [React: useEffect](https://react.dev/reference/react/useEffect)
- [React: useRef](https://react.dev/reference/react/useRef)
- [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React: useDeferredValue](https://react.dev/reference/react/useDeferredValue)

---

## Complete Working Example

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Complete AI Typewriter Component with RAF-based rendering
 */
function AITypewriter({ stream, options = {} }) {
  const {
    baseSpeed = 30,
    maxSpeed = 100,
    catchUpThreshold = 100,
    batchSize = 10,
    showCursor = true,
    showProgress = true
  } = options;
  
  // Display state
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({ bufferLength: 0, progress: 0 });
  
  // Mutable state (refs)
  const bufferRef = useRef('');
  const rafIdRef = useRef(null);
  const lastTimeRef = useRef(null);
  const isStreamingRef = useRef(false);
  const totalReceivedRef = useRef(0);
  const totalDisplayedRef = useRef(0);
  
  // Calculate adaptive speed
  const calculateSpeed = useCallback((bufferSize) => {
    if (bufferSize <= catchUpThreshold) return baseSpeed;
    
    const ratio = Math.min((bufferSize - catchUpThreshold) / catchUpThreshold, 1);
    return baseSpeed + (maxSpeed - baseSpeed) * ratio;
  }, [baseSpeed, maxSpeed, catchUpThreshold]);
  
  // RAF drain loop
  const drainLoop = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    
    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    
    const bufferSize = bufferRef.current.length;
    const speed = calculateSpeed(bufferSize);
    const charsToDisplay = Math.min(Math.ceil(speed * deltaTime), batchSize);
    
    if (charsToDisplay > 0 && bufferSize > 0) {
      const chunk = bufferRef.current.slice(0, charsToDisplay);
      bufferRef.current = bufferRef.current.slice(charsToDisplay);
      
      setDisplayedText(prev => prev + chunk);
      totalDisplayedRef.current += charsToDisplay;
      
      // Update stats every 10 frames
      if (totalDisplayedRef.current % 10 === 0) {
        setStats({
          bufferLength: bufferRef.current.length,
          progress: totalReceivedRef.current > 0 
            ? totalDisplayedRef.current / totalReceivedRef.current 
            : 0
        });
      }
    }
    
    const shouldContinue = bufferRef.current.length > 0 || isStreamingRef.current;
    
    if (shouldContinue) {
      rafIdRef.current = requestAnimationFrame(drainLoop);
    } else {
      rafIdRef.current = null;
      setIsComplete(true);
      setStats(prev => ({ ...prev, progress: 1 }));
    }
  }, [calculateSpeed, batchSize]);
  
  // Add chunk from stream
  const addChunk = useCallback((chunk) => {
    if (!chunk) return;
    
    bufferRef.current += chunk;
    totalReceivedRef.current += chunk.length;
    isStreamingRef.current = true;
    setIsComplete(false);
    
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(drainLoop);
    }
  }, [drainLoop]);
  
  // Handle stream
  useEffect(() => {
    if (!stream) return;
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    async function read() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            isStreamingRef.current = false;
            break;
          }
          
          addChunk(decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        console.error('Stream error:', err);
        isStreamingRef.current = false;
      }
    }
    
    read();
    
    return () => {
      reader.cancel();
    };
  }, [stream, addChunk]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  return (
    <div className="ai-typewriter">
      {showProgress && (
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${stats.progress * 100}%` }}
          />
          <span className="progress-text">
            {Math.round(stats.progress * 100)}%
          </span>
        </div>
      )}
      
      {stats.bufferLength > catchUpThreshold && (
        <div className="catch-up-warning">
          Catching up... ({stats.bufferLength} chars behind)
        </div>
      )}
      
      <div className="content">
        {displayedText}
        {showCursor && !isComplete && (
          <span className="cursor">▊</span>
        )}
      </div>
      
      <div className="stats">
        <span>Speed: {calculateSpeed(stats.bufferLength).toFixed(0)} cps</span>
        <span>Buffer: {stats.bufferLength}</span>
      </div>
    </div>
  );
}

export default AITypewriter;
```

---

## Conclusion

The research demonstrates that RAF-based typewriter effects for AI streaming require careful consideration of:

1. **Time-based animation** using RAF timestamps for consistent speed across refresh rates
2. **Adaptive speed control** to handle variable stream rates and prevent buffer overflow
3. **Efficient state management** using refs for high-frequency updates
4. **Proper cleanup patterns** to prevent memory leaks and orphaned RAF loops
5. **Performance optimization** through batching, throttling, and selective re-renders

The buffer/queue pattern with RAF draining provides the most robust solution for production AI streaming applications, offering smooth visual output even under variable network conditions.

---

## Additional Resources

- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN: Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [React: Effects](https://react.dev/learn/synchronizing-with-effects)
- [React: useRef](https://react.dev/reference/react/useRef)
- [High Precision Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/High_precision_timing)
