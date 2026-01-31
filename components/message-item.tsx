"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageWithUser } from "@/types/database";
import { formatDistanceToNow } from "@/lib/date";
import { MessageSquare } from "lucide-react";

interface MessageItemProps {
  message: MessageWithUser;
  onOpenThread?: (messageId: string) => void;
  onStartDM?: (userId: string) => void;
  currentUserId?: string;
  isThreadReply?: boolean;
}

export function MessageItem({ message, onOpenThread, onStartDM, currentUserId, isThreadReply = false }: MessageItemProps) {
  const username = message.profiles?.username || "Unknown";
  const initial = username[0]?.toUpperCase() || "?";
  const replyCount = (message as MessageWithUser & { reply_count?: number }).reply_count || 0;
  const isOwnMessage = currentUserId === message.user_id;
  const canStartDM = onStartDM && !isOwnMessage;

  function handleUsernameClick() {
    if (canStartDM) {
      onStartDM(message.user_id);
    }
  }

  if (isOwnMessage) {
    // Own messages: right-aligned with purple bubble
    return (
      <div className="flex justify-end group py-1">
        <div className="max-w-[70%]">
          <div className="flex items-baseline gap-2 justify-end mb-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at))}
            </span>
            <span className="font-semibold text-sm">{username}</span>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-2">
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          {/* Thread indicator and reply button */}
          {!isThreadReply && (
            <div className="flex items-center gap-2 mt-1 justify-end">
              {replyCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => onOpenThread?.(message.id)}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={() => onOpenThread?.(message.id)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Other people's messages: left-aligned with avatar
  return (
    <div className="flex gap-3 group py-1">
      <Avatar
        className={`h-9 w-9 mt-0.5 flex-shrink-0 ${canStartDM ? 'cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all' : ''}`}
        onClick={handleUsernameClick}
      >
        <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-sm">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[70%]">
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={`font-semibold text-sm ${canStartDM ? 'cursor-pointer hover:text-purple-600 hover:underline transition-colors' : ''}`}
            onClick={handleUsernameClick}
            title={canStartDM ? `Message ${username}` : undefined}
          >
            {username}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at))}
          </span>
        </div>
        <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-2">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        {/* Thread indicator and reply button */}
        {!isThreadReply && (
          <div className="flex items-center gap-2 mt-1">
            {replyCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => onOpenThread?.(message.id)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={() => onOpenThread?.(message.id)}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Reply
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
