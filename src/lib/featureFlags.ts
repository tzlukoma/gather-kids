type FlagName =
  | "LOGIN_MAGIC_ENABLED"
  | "LOGIN_PASSWORD_ENABLED"
  | "LOGIN_GOOGLE_ENABLED"
  | "DATABASE_MODE"; // demo | supabase

export function getFlag(name: FlagName): boolean | string {
  switch (name) {
    case "LOGIN_MAGIC_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED === "true";
    case "LOGIN_PASSWORD_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED === "true";
    case "LOGIN_GOOGLE_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED === "true";
    case "DATABASE_MODE":
      return process.env.NEXT_PUBLIC_DATABASE_MODE ?? "demo";
    default:
      return false;
  }
}

export function isDemo(): boolean {
  return getFlag("DATABASE_MODE") === "demo";
}