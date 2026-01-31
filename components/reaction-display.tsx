"use client";

import { ReactionWithUsers } from "@/types/database";

interface ReactionDisplayProps {
  reactions: ReactionWithUsers[];
  onToggle: (emoji: string) => void;
  currentUserId?: string;
}

export function ReactionDisplay({
  reactions,
  onToggle,
  currentUserId,
}: ReactionDisplayProps) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => {
        const hasReacted = currentUserId
          ? reaction.userIds.includes(currentUserId)
          : false;

        return (
          <button
            key={reaction.emoji}
            onClick={() => onToggle(reaction.emoji)}
            title={`${reaction.count} ${reaction.count === 1 ? "person" : "people"} reacted`}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              transition-colors cursor-pointer
              ${
                hasReacted
                  ? "bg-purple-100 border border-purple-300 text-purple-700"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
              }
            `}
          >
            <span>{reaction.emoji}</span>
            <span className="font-medium">{reaction.count}</span>
          </button>
        );
      })}
    </div>
  );
}
