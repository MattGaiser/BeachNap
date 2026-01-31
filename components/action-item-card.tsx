"use client";

import { CheckSquare, User, ExternalLink, X } from "lucide-react";
import { ActionItem } from "@/types/action-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/date";

interface ActionItemCardProps {
  item: ActionItem;
  onJumpToMessage?: (messageId: string) => void;
  onDismiss?: (messageId: string) => void;
  compact?: boolean;
}

export function ActionItemCard({
  item,
  onJumpToMessage,
  onDismiss,
  compact = false,
}: ActionItemCardProps) {
  if (compact) {
    return (
      <div className="group flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
        <CheckSquare className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{item.extractedTask}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.assignee && (
              <Badge variant="secondary" className="text-xs py-0">
                @{item.assignee}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {item.authorUsername}
            </span>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(item.messageId)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 transition-all"
            title="Dismiss"
          >
            <X className="h-3 w-3 text-slate-500" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="bg-green-100 p-2 rounded-lg">
          <CheckSquare className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {item.extractedTask}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.assignee && (
              <Badge variant="secondary" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                {item.assignee}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              by {item.authorUsername}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.createdAt))}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {onJumpToMessage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                onClick={() => onJumpToMessage(item.messageId)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View message
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                onClick={() => onDismiss(item.messageId)}
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
