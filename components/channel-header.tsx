"use client";

import { Hash, Sparkles, Loader2, CheckSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/date";

interface ChannelHeaderProps {
  channelName: string;
  channelId: string;
  onCatchMeUp: () => void;
  onOpenActionItems?: () => void;
  isLoading: boolean;
  lastViewed?: Date | null;
}

export function ChannelHeader({
  channelName,
  channelId,
  onCatchMeUp,
  onOpenActionItems,
  isLoading,
  lastViewed,
}: ChannelHeaderProps) {
  return (
    <div className="border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{channelName}</h1>
      </div>
      <div className="flex items-center gap-3">
        {lastViewed && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last viewed {formatDistanceToNow(lastViewed)}</span>
          </div>
        )}
        {onOpenActionItems && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenActionItems}
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Action Items
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onCatchMeUp}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Catch me up
        </Button>
      </div>
    </div>
  );
}
