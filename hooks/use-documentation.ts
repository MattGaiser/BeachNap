"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DocumentationEntry {
  id: string;
  question: string;
  answer: string;
  source_messages: Array<{ id: string; channel_id: string | null; channel: string; username: string }>;
  created_at: string;
  updated_at: string;
}

export function useDocumentation() {
  const [entries, setEntries] = useState<DocumentationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocumentation = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("documentation")
      .select("id, question, answer, source_messages, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEntries(data as DocumentationEntry[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDocumentation();

    // Subscribe to new documentation entries
    const supabase = createClient();
    const channel = supabase
      .channel("documentation_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "documentation",
        },
        (payload) => {
          setEntries((prev) => [payload.new as DocumentationEntry, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDocumentation]);

  return { entries, isLoading, refetch: fetchDocumentation };
}

export function useDocumentationEntry(id: string) {
  const [entry, setEntry] = useState<DocumentationEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEntry() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("documentation")
        .select("id, question, answer, source_messages, created_at, updated_at")
        .eq("id", id)
        .single();

      if (!error && data) {
        setEntry(data as DocumentationEntry);
      }
      setIsLoading(false);
    }

    fetchEntry();
  }, [id]);

  return { entry, isLoading };
}
