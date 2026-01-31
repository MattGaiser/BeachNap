"use client";

import { useState, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

interface ToneCheckResult {
  isIncomplete: boolean;
  suggestion?: string;
  patternType?: string;
}

// Quick patterns that definitely indicate incomplete messages
const INCOMPLETE_PATTERNS = [
  /^(hi|hey|hello|yo|hiya|sup|heya)[\s!?.]*$/i,
  /^(ping|pinging)[\s!?.]*$/i,
  /^(quick question|got a sec|got a minute|you there|are you there)[\s!?.]*$/i,
  /^@\w+[\s!?.]*$/,
  /^(can i ask|may i ask)[\s!?.]*$/i,
];

// Patterns that indicate a complete message
const COMPLETE_PATTERNS = [
  /\?.*\w{3,}/,
  /\w{3,}.*\?/,
  /because|since|regarding|about|for|with/i,
  /.{50,}/,
];

function quickCheck(text: string): "incomplete" | "complete" | "uncertain" {
  const trimmed = text.trim();

  // Empty or very long messages don't need tone check
  if (!trimmed || trimmed.length > 100) {
    return "complete";
  }

  // Check for complete patterns first
  if (COMPLETE_PATTERNS.some(p => p.test(trimmed))) {
    return "complete";
  }

  // Check for obvious incomplete patterns
  if (INCOMPLETE_PATTERNS.some(p => p.test(trimmed))) {
    return "incomplete";
  }

  // Short messages (under 15 chars) are likely incomplete
  if (trimmed.length < 15) {
    return "incomplete";
  }

  // Messages 15-50 chars are uncertain
  if (trimmed.length <= 50) {
    return "uncertain";
  }

  return "complete";
}

export function useToneCheck() {
  const [result, setResult] = useState<ToneCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCheckedRef = useRef<string>("");

  const checkTone = useDebouncedCallback(async (text: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmed = text.trim();

    // Quick classification first
    const quickResult = quickCheck(trimmed);

    if (quickResult === "complete") {
      setResult(null);
      setIsLoading(false);
      return;
    }

    // If quick check says incomplete and it matches a pattern, use regex result
    if (quickResult === "incomplete" && trimmed.length < 15) {
      setResult({
        isIncomplete: true,
        suggestion: "Your message seems brief. Consider adding more context so the recipient can fully understand and respond.",
      });
      setIsLoading(false);
      return;
    }

    // For uncertain or pattern-matched incomplete, call the API
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/tone-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        signal: abortControllerRef.current.signal,
      });

      const data = await res.json();

      if (data.isIncomplete) {
        setResult({
          isIncomplete: true,
          suggestion: data.suggestion,
          patternType: data.patternType,
        });
      } else {
        setResult(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Tone check failed:", error);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, 300); // Faster debounce than preflight

  const checkMessage = useCallback((text: string) => {
    const trimmed = text.trim();

    // Reset dismissed state when message changes significantly
    if (dismissed && trimmed !== lastCheckedRef.current) {
      setDismissed(false);
    }
    lastCheckedRef.current = trimmed;

    // If dismissed, don't check
    if (dismissed) {
      return;
    }

    // Empty or very short messages clear the result
    if (trimmed.length < 2) {
      setResult(null);
      setIsLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    // Very long messages don't need tone check
    if (trimmed.length > 100) {
      setResult(null);
      setIsLoading(false);
      return;
    }

    // Quick check for obvious cases
    const quickResult = quickCheck(trimmed);
    if (quickResult === "complete") {
      setResult(null);
      setIsLoading(false);
      return;
    }

    // Set loading and trigger debounced check
    setIsLoading(true);
    checkTone(trimmed);
  }, [checkTone, dismissed]);

  const dismiss = useCallback(() => {
    setResult(null);
    setDismissed(true);
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setDismissed(false);
    setIsLoading(false);
    lastCheckedRef.current = "";
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    result,
    isLoading,
    checkMessage,
    dismiss,
    reset,
    isDismissed: dismissed,
  };
}
