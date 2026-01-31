"use client";

import { AlertTriangle, X, Loader2, ExternalLink, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ToneCheckResult {
  isIncomplete: boolean;
  suggestion?: string;
  patternType?: string;
}

interface ToneCheckCardProps {
  result: ToneCheckResult | null;
  isLoading: boolean;
  onDismiss: () => void;
  onSendAnyway?: () => void;
}

export function ToneCheckCard({ result, isLoading, onDismiss, onSendAnyway }: ToneCheckCardProps) {
  if (isLoading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          <span className="text-sm text-amber-700">Checking message...</span>
        </CardContent>
      </Card>
    );
  }

  if (!result || !result.isIncomplete) {
    return null;
  }

  return (
    <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardHeader className="py-3 px-4 space-y-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-amber-800">
                Consider adding context
              </CardTitle>
              <p className="text-sm text-amber-700">
                {result.suggestion || "Try including your full question or request in this message."}
              </p>
              <a
                href="https://nohello.net"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 hover:underline"
              >
                Learn more about effective messaging
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            onClick={onDismiss}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-amber-200">
          <Button
            variant="outline"
            size="sm"
            onClick={onSendAnyway}
            className="text-amber-700 border-amber-300 hover:bg-amber-100"
          >
            <Send className="h-3 w-3 mr-1" />
            Send anyway
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
