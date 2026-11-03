export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  adigunelectrocad: {
    Tables: {
      my_data: {
        Row: { id: number; user_id: string; content: string | null; created_at: string | null; };
        Insert: { user_id: string; content?: string | null; created_at?: string | null; };
        Update: { content?: string | null; };
        Relationships: [];
      };
      projects: {
        Row: { id: string; user_id: string; name: string; description: string; document: Json; revision: number; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; name: string; description?: string; document: Json; revision?: number; created_at?: string; updated_at?: string; };
        Update: { id?: string; user_id?: string; name?: string; description?: string; document?: Json; revision?: number; updated_at?: string; };
        Relationships: [];
      };
      user_preferences: {
        Row: { id: string; user_id: string; theme: string; locale: string; favorites: Json; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; theme?: string; locale?: string; favorites?: Json; created_at?: string; updated_at?: string; };
        Update: { id?: string; user_id?: string; theme?: string; locale?: string; favorites?: Json; updated_at?: string; };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
