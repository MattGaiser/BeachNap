"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";

// Common emoji categories for the full picker
const COMMON_EMOJIS = [
  "👍", "👎", "❤️", "😂", "😢", "😮", "😡", "🎉",
  "🔥", "👀", "🙌", "👏", "💯", "✅", "❌", "🤔",
  "💡", "🚀", "⭐", "💜", "🙏", "😊", "🫂", "💪",
];

interface ReactionPickerProps {
  suggestions?: string[];
  suggestionsLoading?: boolean;
  onSelect: (emoji: string) => void;
}

export function ReactionPicker({
  suggestions = [],
  suggestionsLoading = false,
  onSelect,
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Smile className="h-4 w-4 text-slate-400 hover:text-slate-600" />
      </Button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-white rounded-lg shadow-lg border z-50">
          {/* AI Suggestions Section */}
          {(suggestions.length > 0 || suggestionsLoading) && (
            <div className="mb-2 pb-2 border-b">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                {suggestionsLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Suggesting...
                  </>
                ) : (
                  "Suggested"
                )}
              </p>
              <div className="flex gap-1">
                {suggestions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="text-xl p-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Emojis Grid */}
          <div className="grid grid-cols-8 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="text-lg p-1 rounded hover:bg-slate-100 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version that just shows quick reactions inline
interface QuickReactionsProps {
  suggestions?: string[];
  onSelect: (emoji: string) => void;
}

export function QuickReactions({ suggestions = [], onSelect }: QuickReactionsProps) {
  const emojis = suggestions.length > 0 ? suggestions : ["👍", "❤️", "👀", "🙌"];

  return (
    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {emojis.slice(0, 4).map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="text-sm p-1 rounded hover:bg-slate-100 transition-colors"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
