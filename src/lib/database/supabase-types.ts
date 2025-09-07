/**
 * This file contains types generated from the Supabase schema.
 * DO NOT EDIT MANUALLY. This file is auto-generated.
 * Generated on: 2025-09-07T00:17:42.001Z
 */

// Supabase CLI not available - using fallback types
// Install Supabase CLI to generate actual types from schema

export interface Database {
	public: {
		Tables: {
			[key: string]: {
				Row: any;
				Insert: any;
				Update: any;
				Relationships: any[];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
}

export type SupabaseJson = any;
