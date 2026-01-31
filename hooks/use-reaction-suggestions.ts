"use client";

import { useState, useRef, useCallback } from "react";

interface SuggestionsResult {
  suggestions: string[];
  method: string;
}

export function useReactionSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, string[]>>(new Map());

  const getSuggestions = useCallback(async (content: string) => {
    // Check cache first
    const cached = cacheRef.current.get(content);
    if (cached) {
      setSuggestions(cached);
      return cached;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Short messages get default suggestions
    if (!content || content.length < 5) {
      const defaults = ["👍", "❤️", "👀", "🙌"];
      setSuggestions(defaults);
      return defaults;
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const res = await fetch("/api/reactions/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal,
      });

      const data: SuggestionsResult = await res.json();

      // Cache the result
      cacheRef.current.set(content, data.suggestions);

      // Limit cache size
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      setSuggestions(data.suggestions);
      return data.suggestions;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return suggestions;
      }
      console.error("Failed to get suggestions:", error);
      const defaults = ["👍", "❤️", "👀", "🙌"];
      setSuggestions(defaults);
      return defaults;
    } finally {
      setIsLoading(false);
    }
  }, [suggestions]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, isLoading, getSuggestions, clearSuggestions };
}
