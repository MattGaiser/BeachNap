"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./message-item";
import { DmMessageWithUser, MessageWithUser } from "@/types/database";
import { Loader2 } from "lucide-react";

interface DmMessageListProps {
  messages: DmMessageWithUser[];
  isLoading: boolean;
}

export function DmMessageList({ messages, isLoading }: DmMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-6">
      <div className="py-4 space-y-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message as unknown as MessageWithUser} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
