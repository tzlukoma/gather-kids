#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Directory setup
const TYPES_DIR = path.join(process.cwd(), 'src', 'lib', 'database');
if (!fs.existsSync(TYPES_DIR)) {
	fs.mkdirSync(TYPES_DIR, { recursive: true });
}

const TYPES_FILE = path.join(TYPES_DIR, 'supabase-types.ts');
const HEADER = `/**
 * This file contains types generated from the Supabase schema.
 * DO NOT EDIT MANUALLY. This file is auto-generated.
 * Generated on: ${new Date().toISOString()}
 */

`;

// Parse command-line arguments
const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const projectId = process.env.SUPABASE_PROJECT_ID;

// Check if Supabase CLI is available
function isSupabaseCLIAvailable() {
	// If caller provided explicit SUPABASE_CLI, prefer that
	if (process.env.SUPABASE_CLI) {
		try {
			execSync(`${process.env.SUPABASE_CLI} --version`, { stdio: 'ignore' });
			return { type: 'explicit', path: process.env.SUPABASE_CLI };
		} catch (err) {
			console.warn(
				`Supplied SUPABASE_CLI (${process.env.SUPABASE_CLI}) is not executable or not found.`
			);
		}
	}

	// First try the bin directory where some workflows install it
	try {
		const binPath = `${process.env.HOME}/.bin/supabase`;
		execSync(`${binPath} --version`, { stdio: 'ignore' });
		return { type: 'bin', path: binPath };
	} catch (error) {
		// Try the global command
		try {
			execSync('supabase --version', { stdio: 'ignore' });
			return { type: 'global', path: 'supabase' };
		} catch (error2) {
			return false;
		}
	}
}

// Create a more comprehensive typed mock file
function createTypedMockFile() {
	const typedMockTypes =
		HEADER +
		`// MOCK TYPES: These are manually created to unblock development
// This file is intended to be replaced with generated types when available

export interface Database {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          id: string;
          created_at: string;
          child_id: string;
          event_id: string;
          status: string;
          guardian_id: string | null;
          check_in_time: string | null;
          check_out_time: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          child_id: string;
          event_id: string;
          status?: string;
          guardian_id?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          child_id?: string;
          event_id?: string;
          status?: string;
          guardian_id?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "guardians";
            referencedColumns: ["id"];
          }
        ];
      };
      children: {
        Row: {
          id: string;
          created_at: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          household_id: string;
          notes: string | null;
          allergies: string | null;
          photo_url: string | null;
          status: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          first_name: string;
          last_name: string;
          date_of_birth?: string | null;
          household_id: string;
          notes?: string | null;
          allergies?: string | null;
          photo_url?: string | null;
          status?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          first_name?: string;
          last_name?: string;
          date_of_birth?: string | null;
          household_id?: string;
          notes?: string | null;
          allergies?: string | null;
          photo_url?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "children_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          ministry_id: string;
          location: string | null;
          recurring: boolean | null;
          status: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          ministry_id: string;
          location?: string | null;
          recurring?: boolean | null;
          status?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          ministry_id?: string;
          location?: string | null;
          recurring?: boolean | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_ministry_id_fkey";
            columns: ["ministry_id"];
            isOneToOne: false;
            referencedRelation: "ministries";
            referencedColumns: ["id"];
          }
        ];
      };
      guardians: {
        Row: {
          id: string;
          created_at: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          relationship: string | null;
          household_id: string;
          photo_url: string | null;
          is_authorized_pickup: boolean;
          status: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          relationship?: string | null;
          household_id: string;
          photo_url?: string | null;
          is_authorized_pickup?: boolean;
          status?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          relationship?: string | null;
          household_id?: string;
          photo_url?: string | null;
          is_authorized_pickup?: boolean;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guardians_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      households: {
        Row: {
          id: string;
          created_at: string;
          name: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          status: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "households_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      incidents: {
        Row: {
          id: string;
          created_at: string;
          child_id: string;
          reported_by: string | null;
          description: string;
          severity: string;
          status: string;
          resolution: string | null;
          event_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          child_id: string;
          reported_by?: string | null;
          description: string;
          severity: string;
          status?: string;
          resolution?: string | null;
          event_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          child_id?: string;
          reported_by?: string | null;
          description?: string;
          severity?: string;
          status?: string;
          resolution?: string | null;
          event_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      ministries: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string | null;
          leader_id: string | null;
          age_range_min: number | null;
          age_range_max: number | null;
          status: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          description?: string | null;
          leader_id?: string | null;
          age_range_min?: number | null;
          age_range_max?: number | null;
          status?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          description?: string | null;
          leader_id?: string | null;
          age_range_min?: number | null;
          age_range_max?: number | null;
          status?: string | null;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          created_at: string;
          child_id: string;
          ministry_id: string;
          registration_date: string;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          child_id: string;
          ministry_id: string;
          registration_date?: string;
          status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          child_id?: string;
          ministry_id?: string;
          registration_date?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registrations_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_ministry_id_fkey";
            columns: ["ministry_id"];
            isOneToOne: false;
            referencedRelation: "ministries";
            referencedColumns: ["id"];
          }
        ];
      };
      scripture_memorization: {
        Row: {
          id: string;
          created_at: string;
          child_id: string;
          scripture_id: string;
          memorized_date: string | null;
          verified_by: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          child_id: string;
          scripture_id: string;
          memorized_date?: string | null;
          verified_by?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          child_id?: string;
          scripture_id?: string;
          memorized_date?: string | null;
          verified_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scripture_memorization_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scripture_memorization_scripture_id_fkey";
            columns: ["scripture_id"];
            isOneToOne: false;
            referencedRelation: "scriptures";
            referencedColumns: ["id"];
          }
        ];
      };
      scriptures: {
        Row: {
          id: string;
          created_at: string;
          reference: string;
          text: string;
          translation: string | null;
          difficulty_level: number | null;
          status: string | null;
          category: string | null;
          points: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          reference: string;
          text: string;
          translation?: string | null;
          difficulty_level?: number | null;
          status?: string | null;
          category?: string | null;
          points?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          reference?: string;
          text?: string;
          translation?: string | null;
          difficulty_level?: number | null;
          status?: string | null;
          category?: string | null;
          points?: number | null;
        };
        Relationships: [];
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
`;

	fs.writeFileSync(TYPES_FILE, typedMockTypes);
	console.log(`✅ Created comprehensive mock types: ${TYPES_FILE}`);
	console.log('📖 These mock types contain common tables and fields to unblock development.');
	console.log('   They can be replaced when actual schema generation is available.');
}

// Create a fallback types file if CLI is not available
function createFallbackTypes() {
	const fallbackTypes =
		HEADER +
		`// Supabase CLI not available - using fallback types
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
`;

	fs.writeFileSync(TYPES_FILE, fallbackTypes);
	console.log(
		`⚠️  Supabase CLI not available. Created fallback types: ${TYPES_FILE}`
	);
	console.log('📖 To generate actual types, install Supabase CLI:');
	console.log(
		'   - Using Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh'
	);
	console.log(
		'   - Or download from: https://github.com/supabase/cli/releases'
	);
}

function main() {
	try {
		// Check if Supabase CLI is available
		const cliLocation = isSupabaseCLIAvailable();
		if (!cliLocation) {
			createFallbackTypes();
			return;
		}

		// Use the correct path to the Supabase CLI and log it for determinism
		const supabasePath = cliLocation.path;
		console.log(
			`🔎 Using Supabase CLI at: ${supabasePath} (detected: ${cliLocation.type})`
		);
		
		// Check if this is a test run to generate mock types
		const generateMockTypes = args.includes('--mock');
		if (generateMockTypes) {
			console.log('📦 Generating mock types instead of trying CLI...');
			createTypedMockFile();
			return;
		}

		let command;
		if (useLocal) {
			console.log('📦 Generating types from local Supabase instance...');
			// Must specify --local flag when using local generation
			// This is required by the CLI (--schema is an additional option)
			command = `${supabasePath} gen types typescript --local --schema public`;
		} else if (projectId) {
			console.log(
				`📦 Generating types from remote Supabase project (${projectId})...`
			);
			command = `${supabasePath} gen types typescript --project-id "${projectId}" --schema public`;
		} else {
			console.error(
				'❌ No project ID provided and --local not specified. Set SUPABASE_PROJECT_ID or use --local flag.'
			);
			process.exit(1);
		}

		// Execute type generation
		console.log(`▶️  Executing: ${command}`);
		const types = execSync(command, {
			stdio: ['ignore', 'pipe', 'pipe'],
		}).toString();

		// Post-process the types
		const processedTypes =
			HEADER +
			types
				// Replace all instances of Json with SupabaseJson to avoid conflicts
				.replace(/export type Json/, 'export type SupabaseJson')
				.replace(/\bJson\b/g, 'SupabaseJson');
		// Add more replacements as needed

		fs.writeFileSync(TYPES_FILE, processedTypes);
		console.log(`✅ Types generated successfully: ${TYPES_FILE}`);
	} catch (error) {
		console.error('❌ Failed to generate types:', error.message);

		// Create fallback types on error
		console.log('📦 Creating fallback types...');
		createFallbackTypes();
	}
}

// Run the main function
main();
