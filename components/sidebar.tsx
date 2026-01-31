"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, MessageSquare, LogOut, UserPlus, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useChannels } from "@/hooks/use-channels";
import { useDmConversations } from "@/hooks/use-dm-conversations";
import { logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { channels } = useChannels();
  const { conversations } = useDmConversations();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          BeachNap
        </h1>
        <p className="text-xs text-slate-400 mt-1">AI-Powered Knowledge</p>
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* Channels Section */}
        <div className="py-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Channels
            </span>
          </div>
          <nav className="space-y-1">
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/channels/${channel.id}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                  pathname === `/channels/${channel.id}`
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Hash className="h-4 w-4" />
                {channel.name}
              </Link>
            ))}
          </nav>
        </div>

        <Separator className="bg-slate-700" />

        {/* DMs Section */}
        <div className="py-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Direct Messages
            </span>
            <Link href="/dm" className="text-slate-400 hover:text-white" title="Start new conversation">
              <UserPlus className="h-4 w-4" />
            </Link>
          </div>
          <nav className="space-y-1">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/dm/${conv.id}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                  pathname === `/dm/${conv.id}`
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                {conv.otherUser?.username || "Unknown"}
              </Link>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-slate-500 px-2">No conversations yet</p>
            )}
          </nav>
        </div>

        <Separator className="bg-slate-700" />

        {/* Documentation Section */}
        <div className="py-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Documentation
            </span>
          </div>
          <nav className="space-y-1">
            <Link
              href="/docs"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                pathname === "/docs" || pathname?.startsWith("/docs/")
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Browse Knowledge
            </Link>
          </nav>
        </div>
      </ScrollArea>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
              {user?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
