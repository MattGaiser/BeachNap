"use client";

import { Lightbulb, X, Loader2, Sparkles, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PreflightResult {
  hasAnswer: boolean;
  answer: string;
  sourceCount: number;
  sourceType?: "messages" | "documentation" | "combined";
  timeRange?: {
    earliest: string;
    latest: string;
  };
}

interface PreflightCardProps {
  result: PreflightResult | null;
  isLoading: boolean;
  onDismiss: () => void;
  onSendAnyway?: () => void;
}

export function PreflightCard({ result, isLoading, onDismiss, onSendAnyway }: PreflightCardProps) {
  if (isLoading) {
    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          <span className="text-sm text-purple-700">Searching knowledge base...</span>
        </CardContent>
      </Card>
    );
  }

  if (!result || !result.hasAnswer) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-medium">Knowledge Found</CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="py-0 pb-3 px-4">
        <p className="text-sm text-foreground">{result.answer}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {formatSourceLabel(result.sourceType, result.sourceCount)}
            {result.timeRange && (
              <span>
                {" "}
                ({formatTimeRange(result.timeRange.earliest, result.timeRange.latest)})
              </span>
            )}
          </p>
          {onSendAnyway && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onSendAnyway}
            >
              <Send className="h-3 w-3 mr-1" />
              Ask anyway
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatSourceLabel(
  sourceType: "messages" | "documentation" | "combined" | undefined,
  sourceCount: number
): string {
  switch (sourceType) {
    case "documentation":
      return `From ${sourceCount} saved answer${sourceCount !== 1 ? "s" : ""}`;
    case "combined":
      return `From docs + ${sourceCount} source${sourceCount !== 1 ? "s" : ""}`;
    case "messages":
    default:
      return `Synthesized from ${sourceCount} conversation${sourceCount !== 1 ? "s" : ""}`;
  }
}

function formatTimeRange(earliest: string, latest: string): string {
  const earliestDate = new Date(earliest);
  const latestDate = new Date(latest);

  const sameDay = earliestDate.toDateString() === latestDate.toDateString();

  if (sameDay) {
    return earliestDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return `${earliestDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${latestDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
