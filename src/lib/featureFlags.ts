type FlagName =
  | "LOGIN_MAGIC_ENABLED"
  | "LOGIN_PASSWORD_ENABLED"
  | "LOGIN_GOOGLE_ENABLED"
  | "DATABASE_MODE" // demo | supabase
  | "SHOW_DEMO_FEATURES"
  | "REGISTRATION_DRAFT_PERSISTENCE_ENABLED";

export function getFlag(name: FlagName): boolean | string {
  switch (name) {
    case "LOGIN_MAGIC_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED === "true";
    case "LOGIN_PASSWORD_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED === "true";
    case "LOGIN_GOOGLE_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED === "true";
    case "SHOW_DEMO_FEATURES":
      return process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "true";
    case "REGISTRATION_DRAFT_PERSISTENCE_ENABLED":
      return process.env.NEXT_PUBLIC_REGISTRATION_DRAFT_PERSISTENCE_ENABLED === "true";
    case "DATABASE_MODE":
      // Force supabase mode when demo features are disabled
      if (process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "false") {
        return "supabase";
      }
      return process.env.NEXT_PUBLIC_DATABASE_MODE ?? "demo";
    default:
      return false;
  }
}

export function isDemo(): boolean {
  const mode = getFlag("DATABASE_MODE");
  console.log('isDemo: Checking database mode flag', { 
    mode, 
    isDemo: mode === "demo",
    env: typeof window !== 'undefined' ? 'browser' : 'server',
    NEXT_PUBLIC_DATABASE_MODE: process.env.NEXT_PUBLIC_DATABASE_MODE,
    NEXT_PUBLIC_SHOW_DEMO_FEATURES: process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES
  });
  return mode === "demo";
}