"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./message-item";
import { MessageWithUser } from "@/types/database";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

interface ThreadPanelProps {
  parentMessage: MessageWithUser | null;
  channelId: string;
  onClose: () => void;
  onStartDM?: (userId: string) => void;
}

export function ThreadPanel({ parentMessage, channelId, onClose, onStartDM }: ThreadPanelProps) {
  const [replies, setReplies] = useState<MessageWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  // Fetch thread replies
  useEffect(() => {
    if (!parentMessage) return;

    const supabase = createClient();

    async function fetchReplies() {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .eq("parent_id", parentMessage!.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setReplies(data as MessageWithUser[]);
      }
      setIsLoading(false);
    }

    fetchReplies();

    // Subscribe to new replies
    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `parent_id=eq.${parentMessage.id}`,
        },
        async (payload) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setReplies((prev) => [...prev, data as MessageWithUser]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage]);

  // Scroll to bottom on new replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  async function handleSendReply() {
    if (!replyText.trim() || !user || !parentMessage) return;

    setIsSending(true);

    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          channelId,
          userId: user.id,
          parentId: parentMessage.id,
        }),
      });

      if (res.ok) {
        setReplyText("");
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  if (!parentMessage) return null;

  return (
    <div className="w-96 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="px-4 py-3 border-b bg-slate-50">
        <MessageItem message={parentMessage} isThreadReply onStartDM={onStartDM} currentUserId={user?.id} />
      </div>

      {/* Replies */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No replies yet. Start the conversation!
            </p>
          ) : (
            replies.map((reply) => (
              <MessageItem key={reply.id} message={reply} isThreadReply onStartDM={onStartDM} currentUserId={user?.id} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSendReply}
            disabled={isSending || !replyText.trim()}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
