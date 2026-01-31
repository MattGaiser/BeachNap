"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare } from "lucide-react";

interface NewDmFormProps {
  users: Profile[];
  currentUserId: string;
}

export function NewDmForm({ users, currentUserId }: NewDmFormProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();

  async function startConversation(otherUserId: string) {
    setIsLoading(otherUserId);

    try {
      const res = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUserId,
          otherUserId,
        }),
      });

      const data = await res.json();

      if (data.conversationId) {
        router.push(`/dm/${data.conversationId}`);
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsLoading(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No other users yet. Invite someone to join!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-md">
      <h3 className="font-medium mb-4">Select a user to message</h3>
      {users.map((user) => (
        <Button
          key={user.id}
          variant="ghost"
          className="w-full justify-start h-auto py-3"
          onClick={() => startConversation(user.id)}
          disabled={isLoading !== null}
        >
          <Avatar className="h-8 w-8 mr-3">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
              {user.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.username}</span>
          {isLoading === user.id ? (
            <Loader2 className="h-4 w-4 ml-auto animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4 ml-auto text-muted-foreground" />
          )}
        </Button>
      ))}
    </div>
  );
}
