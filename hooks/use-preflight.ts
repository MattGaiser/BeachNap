"use client";

import { useState, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

interface PreflightResult {
  hasAnswer: boolean;
  answer: string;
  sourceCount: number;
  sourceType?: "messages" | "documentation" | "combined";
  timeRange?: {
    earliest: string;
    latest: string;
  };
}

// Quick regex patterns for obvious questions
const DEFINITE_QUESTION_PATTERNS = [
  /\?$/,
  /^(how do|how does|how can|how to|what is|what are|where is|where can|when did|when does|why is|why does|who is|who can)/i,
];

// Quick regex patterns for obvious non-questions
const DEFINITE_NON_QUESTION_PATTERNS = [
  /^(lol|haha|thanks|thank you|ok|okay|sure|yes|no|yep|nope|cool|nice|great|awesome|done|got it|makes sense|sounds good)$/i,
  /^(hey|hi|hello|morning|afternoon|evening|night|bye|goodbye|later|cheers|brb|afk|gtg)/i,
  /^@\w+/,
  /^:\w+:$/,
];

// Patterns that need AI confirmation
const UNCERTAIN_PATTERNS = [
  /anyone/i,
  /help/i,
  /wondering/i,
  /looking for/i,
  /does.*know/i,
  /can.*tell/i,
  /need to/i,
  /trying to/i,
];

function quickClassify(text: string): "question" | "not_question" | "uncertain" {
  const trimmed = text.trim();

  if (DEFINITE_NON_QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
    return "not_question";
  }

  if (DEFINITE_QUESTION_PATTERNS.some((p) => p.test(trimmed))) {
    return "question";
  }

  if (UNCERTAIN_PATTERNS.some((p) => p.test(trimmed))) {
    return "uncertain";
  }

  if (trimmed.length < 15) {
    return "not_question";
  }

  return "uncertain";
}

export function usePreflight() {
  const [query, setQueryState] = useState("");
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkPreflight = useDebouncedCallback(async (text: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Quick classification first
    const quickResult = quickClassify(text);

    if (quickResult === "not_question") {
      setResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      // If uncertain, check with AI first
      if (quickResult === "uncertain") {
        const detectRes = await fetch("/api/question-detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abortControllerRef.current.signal,
        });

        const detectData = await detectRes.json();
        if (!detectData.isQuestion) {
          setResult(null);
          setIsLoading(false);
          return;
        }
      }

      // Proceed with preflight search
      const res = await fetch("/api/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
        signal: abortControllerRef.current.signal,
      });

      const data = await res.json();
      setResult(data.hasAnswer ? data : null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }
      console.error("Preflight check failed:", error);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, 800);

  const setQuery = useCallback((text: string) => {
    setQueryState(text);

    // If text is empty or too short, clear result immediately
    if (text.length < 10) {
      setResult(null);
      setIsLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    // Quick check for obvious non-questions
    const quickResult = quickClassify(text);
    if (quickResult === "not_question") {
      setResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    checkPreflight(text);
  }, [checkPreflight]);

  const clearResult = useCallback(() => {
    setResult(null);
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { query, result, isLoading, setQuery, clearResult };
}
