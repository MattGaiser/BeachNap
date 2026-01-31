"use client";

import { Sparkles, X, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CatchMeUpResult {
  summary: string | null;
  messageCount: number;
  timeRange: string;
  noActivity: boolean;
}

interface CatchMeUpCardProps {
  result: CatchMeUpResult | null;
  onDismiss: () => void;
}

export function CatchMeUpCard({ result, onDismiss }: CatchMeUpCardProps) {
  if (!result) {
    return null;
  }

  if (result.noActivity) {
    return (
      <Card className="border-slate-200 bg-slate-50 mx-4 mt-4">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-medium text-slate-700">
              No recent activity
            </CardTitle>
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
          <p className="text-sm text-slate-600">
            There haven&apos;t been any messages in the {result.timeRange.toLowerCase()}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 mx-4 mt-4">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-sm font-medium">Channel Summary</CardTitle>
          <Badge variant="secondary" className="text-xs">
            AI Generated
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
      <CardContent className="py-0 pb-3 px-4 space-y-2">
        <div className="text-sm text-foreground whitespace-pre-wrap">
          {result.summary}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {result.messageCount} message{result.messageCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {result.timeRange}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
