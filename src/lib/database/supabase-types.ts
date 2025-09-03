/**
 * This file contains types generated from the Supabase schema.
 * DO NOT EDIT MANUALLY. This file is auto-generated.
 * Generated on: 2025-09-03T04:16:30.634Z
 */

export type SupabaseJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_id: string
          check_in_at: string | null
          checked_in_by: string | null
          child_id: string | null
          created_at: string | null
          date: string | null
          event_id: string | null
          timeslot_id: string | null
        }
        Insert: {
          attendance_id: string
          check_in_at?: string | null
          checked_in_by?: string | null
          child_id?: string | null
          created_at?: string | null
          date?: string | null
          event_id?: string | null
          timeslot_id?: string | null
        }
        Update: {
          attendance_id?: string
          check_in_at?: string | null
          checked_in_by?: string | null
          child_id?: string | null
          created_at?: string | null
          date?: string | null
          event_id?: string | null
          timeslot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      bible_bee_years: {
        Row: {
          created_at: string | null
          description: string | null
          name: string | null
          year: number
          year_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          name?: string | null
          year: number
          year_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          name?: string | null
          year?: number
          year_id?: string
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          created_at: string | null
          font_family: string | null
          logo_url: string | null
          ministry_id: string | null
          primary_color: string | null
          secondary_color: string | null
          setting_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          font_family?: string | null
          logo_url?: string | null
          ministry_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          setting_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          font_family?: string | null
          logo_url?: string | null
          ministry_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          setting_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      child_year_profiles: {
        Row: {
          child_id: string | null
          created_at: string | null
          division_id: string | null
          grade: string | null
          profile_id: string
          year_id: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          division_id?: string | null
          grade?: string | null
          profile_id?: string
          year_id?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          division_id?: string | null
          grade?: string | null
          profile_id?: string
          year_id?: string | null
        }
        Relationships: []
      }
      children: {
        Row: {
          allergies: string | null
          child_mobile: string | null
          created_at: string
          external_household_id: string | null
          external_id: string | null
          grade: string | null
          household_id: string | null
          household_uuid: string | null
          id: number
          is_active: boolean | null
          mobile_phone: string | null
          notes: string | null
          special_needs: boolean | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string | null
          child_mobile?: string | null
          created_at?: string
          external_household_id?: string | null
          external_id?: string | null
          grade?: string | null
          household_id?: string | null
          household_uuid?: string | null
          id?: number
          is_active?: boolean | null
          mobile_phone?: string | null
          notes?: string | null
          special_needs?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string | null
          child_mobile?: string | null
          created_at?: string
          external_household_id?: string | null
          external_id?: string | null
          grade?: string | null
          household_id?: string | null
          household_uuid?: string | null
          id?: number
          is_active?: boolean | null
          mobile_phone?: string | null
          notes?: string | null
          special_needs?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "children_household_uuid_fkey"
            columns: ["household_uuid"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["household_uuid"]
          },
        ]
      }
      competition_years: {
        Row: {
          active: boolean | null
          created_at: string | null
          division_id: string | null
          id: string
          name: string | null
          year_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          name?: string | null
          year_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          name?: string | null
          year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_years_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "bible_bee_years"
            referencedColumns: ["year_id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string | null
          description: string | null
          division_id: string
          max_age: number | null
          min_age: number | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          division_id: string
          max_age?: number | null
          min_age?: number | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          division_id?: string
          max_age?: number | null
          min_age?: number | null
          name?: string | null
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          household_id: string | null
          household_id_uuid: string | null
          name: string | null
          phone: string | null
          relationship: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          household_id?: string | null
          household_id_uuid?: string | null
          name?: string | null
          phone?: string | null
          relationship?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          household_id?: string | null
          household_id_uuid?: string | null
          name?: string | null
          phone?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_emergency_contacts_household"
            columns: ["household_id_uuid"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["household_uuid"]
          },
        ]
      }
      enrollment_overrides: {
        Row: {
          child_id: string | null
          created_at: string | null
          division_id: string | null
          override_id: string
          reason: string | null
          year_id: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          division_id?: string | null
          override_id: string
          reason?: string | null
          year_id?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          division_id?: string | null
          override_id?: string
          reason?: string | null
          year_id?: string | null
        }
        Relationships: []
      }
      essay_prompts: {
        Row: {
          competition_year_id: string | null
          created_at: string | null
          prompt_id: string
          prompt_text: string | null
        }
        Insert: {
          competition_year_id?: string | null
          created_at?: string | null
          prompt_id: string
          prompt_text?: string | null
        }
        Update: {
          competition_year_id?: string | null
          created_at?: string | null
          prompt_id?: string
          prompt_text?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          name: string | null
          timeslots: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          name?: string | null
          timeslots?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          name?: string | null
          timeslots?: Json | null
        }
        Relationships: []
      }
      grade_rules: {
        Row: {
          created_at: string | null
          grade_label: string | null
          max_birth_date: string | null
          min_birth_date: string | null
          ministry_id: string | null
          rule_id: string
        }
        Insert: {
          created_at?: string | null
          grade_label?: string | null
          max_birth_date?: string | null
          min_birth_date?: string | null
          ministry_id?: string | null
          rule_id: string
        }
        Update: {
          created_at?: string | null
          grade_label?: string | null
          max_birth_date?: string | null
          min_birth_date?: string | null
          ministry_id?: string | null
          rule_id?: string
        }
        Relationships: []
      }
      guardians: {
        Row: {
          created_at: string | null
          email: string | null
          external_household_id: string | null
          external_id: string | null
          first_name: string | null
          guardian_id: string
          household_id: string | null
          household_id_uuid: string | null
          household_uuid: string | null
          is_primary: boolean | null
          last_name: string | null
          mobile_phone: string | null
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          external_household_id?: string | null
          external_id?: string | null
          first_name?: string | null
          guardian_id: string
          household_id?: string | null
          household_id_uuid?: string | null
          household_uuid?: string | null
          is_primary?: boolean | null
          last_name?: string | null
          mobile_phone?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          external_household_id?: string | null
          external_id?: string | null
          first_name?: string | null
          guardian_id?: string
          household_id?: string | null
          household_id_uuid?: string | null
          household_uuid?: string | null
          is_primary?: boolean | null
          last_name?: string | null
          mobile_phone?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "guardians_household_uuid_fkey"
            columns: ["household_uuid"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["household_uuid"]
          },
        ]
      }
      households: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          email: string | null
          external_id: string | null
          household_id: string
          household_name: string | null
          household_uuid: string
          preferred_scripture_translation: string | null
          primary_phone: string | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          household_id: string
          household_name?: string | null
          household_uuid?: string
          preferred_scripture_translation?: string | null
          primary_phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          household_id?: string
          household_name?: string | null
          household_uuid?: string
          preferred_scripture_translation?: string | null
          primary_phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          child_id: string | null
          created_at: string | null
          description: string | null
          incident_id: string
          reported_at: string | null
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          description?: string | null
          incident_id: string
          reported_at?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          description?: string | null
          incident_id?: string
          reported_at?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: []
      }
      leader_assignments: {
        Row: {
          assignment_id: string
          created_at: string | null
          leader_id: string | null
          ministry_id: string | null
          role: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          leader_id?: string | null
          ministry_id?: string | null
          role?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          leader_id?: string | null
          ministry_id?: string | null
          role?: string | null
        }
        Relationships: []
      }
      ministries: {
        Row: {
          created_at: string | null
          description: string | null
          ministry_id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ministry_id: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ministry_id?: string
          name?: string | null
        }
        Relationships: []
      }
      ministry_enrollments: {
        Row: {
          child_id: string | null
          created_at: string | null
          custom_fields: Json | null
          enrollment_id: string
          ministry_id: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          enrollment_id: string
          ministry_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          enrollment_id?: string
          ministry_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: []
      }
      ministry_leaders: {
        Row: {
          created_at: string | null
          leader_id: string
          ministry_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          leader_id: string
          ministry_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          leader_id?: string
          ministry_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string | null
          household_id: string | null
          notes: string | null
          registration_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          household_id?: string | null
          notes?: string | null
          registration_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          household_id?: string | null
          notes?: string | null
          registration_id?: string
          status?: string | null
        }
        Relationships: []
      }
      scriptures: {
        Row: {
          competition_year_id: string
          created_at: string | null
          external_id: string | null
          id: string
          order: number
          reference: string
          texts: Json
          updated_at: string | null
        }
        Insert: {
          competition_year_id: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          order: number
          reference: string
          texts: Json
          updated_at?: string | null
        }
        Update: {
          competition_year_id?: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          order?: number
          reference?: string
          texts?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      student_essays: {
        Row: {
          created_at: string | null
          enrollment_id: string | null
          id: string
          notes: string | null
          score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_scriptures: {
        Row: {
          created_at: string | null
          enrollment_id: string | null
          id: string
          notes: string | null
          score: number | null
          scripture_id: string | null
          scripture_id_uuid: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          scripture_id?: string | null
          scripture_id_uuid?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          scripture_id?: string | null
          scripture_id_uuid?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_student_scriptures_scripture"
            columns: ["scripture_id_uuid"]
            isOneToOne: false
            referencedRelation: "scriptures"
            referencedColumns: ["id"]
          },
        ]
      }
      timeslots: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          event_id: string | null
          start_time: string | null
          timeslot_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_id?: string | null
          start_time?: string | null
          timeslot_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_id?: string | null
          start_time?: string | null
          timeslot_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      safe_add_column: {
        Args: {
          p_column_def: string
          p_column_name: string
          p_table_name: string
        }
        Returns: undefined
      }
      safe_add_foreign_key: {
        Args: {
          p_column_name: string
          p_constraint_name: string
          p_on_delete?: string
          p_ref_column: string
          p_ref_table: string
          p_table_name: string
        }
        Returns: undefined
      }
      safe_alter_column: {
        Args: {
          p_alter_command: string
          p_column_name: string
          p_table_name: string
        }
        Returns: undefined
      }
      safe_alter_column_type: {
        Args: {
          p_column_name: string
          p_table_name: string
          p_type: string
          p_using_expr?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
