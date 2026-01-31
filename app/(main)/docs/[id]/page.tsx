"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, MessageSquare, User, Hash, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDocumentationEntry } from "@/hooks/use-documentation";

export default function DocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { entry, isLoading } = useDocumentationEntry(params.id as string);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Entry not found</h3>
          <Button variant="outline" onClick={() => router.push("/docs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to documentation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.push("/docs")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to documentation
        </Button>
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <BookOpen className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold mb-1">{entry.question}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created{" "}
                {new Date(entry.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              {entry.updated_at !== entry.created_at && (
                <div className="flex items-center gap-1">
                  Updated{" "}
                  {new Date(entry.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="secondary">AI Answer</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{entry.answer}</p>
          </CardContent>
        </Card>

        {entry.source_messages && entry.source_messages.length > 0 && (
          <>
            <Separator className="my-6" />
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Source Messages ({entry.source_messages.length})
              </h3>
              <div className="space-y-2">
                {entry.source_messages.map((source, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {source.channel}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" />
                        {source.username}
                      </div>
                    </div>
                    {source.channel_id && (
                      <Link
                        href={`/channels/${source.channel_id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View in channel
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
