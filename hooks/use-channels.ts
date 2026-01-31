"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Channel } from "@/types/database";

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchChannels() {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("name");

      if (!error && data) {
        setChannels(data);
      }
      setIsLoading(false);
    }

    fetchChannels();
  }, []);

  return { channels, isLoading };
}
