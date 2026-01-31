"use client";

import { useEffect } from "react";
import { X, CheckSquare, RefreshCw, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActionItemCard } from "./action-item-card";
import { useActionItems } from "@/hooks/use-action-items";

interface ActionItemsPanelProps {
  channelId: string;
  channelName: string;
  userId?: string;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
}

export function ActionItemsPanel({
  channelId,
  channelName,
  userId,
  onClose,
  onJumpToMessage,
}: ActionItemsPanelProps) {
  const { items, isLoading, timeRange, fetchActionItems, refresh, dismissItem } =
    useActionItems(channelId, userId);

  useEffect(() => {
    fetchActionItems();
  }, [fetchActionItems]);

  return (
    <div className="w-96 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold">Action Items</h3>
            <p className="text-xs text-muted-foreground">#{channelName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Time Range */}
      {timeRange && (
        <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeRange}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No action items found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Action items will appear when people make commitments or assign
                tasks.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <ActionItemCard
                key={item.messageId}
                item={item}
                onJumpToMessage={onJumpToMessage}
                onDismiss={userId ? dismissItem : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
