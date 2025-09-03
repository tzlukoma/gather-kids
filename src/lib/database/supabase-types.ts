/**
 * This file contains types generated from the Supabase schema.
 * DO NOT EDIT MANUALLY. This file is auto-generated.
 * Generated on: 2025-09-03T04:58:27.464Z
 */

export type SupabaseJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SupabaseJson | undefined }
  | SupabaseJson[]

export type Database = {
  public: {
    Tables: {
      branding_settings: {
        Row: {
          app_name: string | null
          created_at: string | null
          description: string | null
          font_family: string | null
          instagram_url: string | null
          logo_url: string | null
          ministry_id: string | null
          org_id: string
          organization_name: string | null
          primary_color: string | null
          secondary_color: string | null
          setting_id: string
          updated_at: string | null
          use_logo_only: boolean | null
          youtube_url: string | null
        }
        Insert: {
          app_name?: string | null
          created_at?: string | null
          description?: string | null
          font_family?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          ministry_id?: string | null
          org_id: string
          organization_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          setting_id?: string
          updated_at?: string | null
          use_logo_only?: boolean | null
          youtube_url?: string | null
        }
        Update: {
          app_name?: string | null
          created_at?: string | null
          description?: string | null
          font_family?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          ministry_id?: string | null
          org_id?: string
          organization_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          setting_id?: string
          updated_at?: string | null
          use_logo_only?: boolean | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      // Additional tables would be defined here but using minimal schema for testing
      [key: string]: {
        Row: any;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
