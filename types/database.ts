export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          created_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          content: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string;
          content?: string;
          embedding?: number[] | null;
          created_at?: string;
        };
      };
      dm_conversations: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
        };
      };
      dm_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
        };
      };
      dm_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          content: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          content?: string;
          embedding?: number[] | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      search_messages: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          channel_id: string;
          channel_name: string;
          user_id: string;
          username: string;
          created_at: string;
          similarity: number;
        }[];
      };
      get_context_window: {
        Args: {
          p_channel_id: string;
          p_timestamp: string;
          p_window_minutes?: number;
        };
        Returns: {
          id: string;
          content: string;
          user_id: string;
          username: string;
          created_at: string;
        }[];
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Channel = Database["public"]["Tables"]["channels"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type DmConversation = Database["public"]["Tables"]["dm_conversations"]["Row"];
export type DmMessage = Database["public"]["Tables"]["dm_messages"]["Row"];

export type MessageWithUser = Message & {
  profiles: Profile;
};

export type DmMessageWithUser = DmMessage & {
  profiles: Profile;
};
