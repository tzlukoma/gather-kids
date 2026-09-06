type FlagName =
  | "LOGIN_MAGIC_ENABLED"
  | "LOGIN_PASSWORD_ENABLED"
  | "LOGIN_GOOGLE_ENABLED"
  | "REGISTRATION_DRAFT_PERSISTENCE_ENABLED"
  | "SHOW_MINISTRY_GROUPS";

export function getFlag(name: FlagName): boolean | string {
  switch (name) {
    case "LOGIN_MAGIC_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED === "true";
    case "LOGIN_PASSWORD_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED === "true";
    case "LOGIN_GOOGLE_ENABLED":
      return process.env.NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED === "true";
    case "REGISTRATION_DRAFT_PERSISTENCE_ENABLED":
      return process.env.NEXT_PUBLIC_REGISTRATION_DRAFT_PERSISTENCE_ENABLED === "true";
    case "SHOW_MINISTRY_GROUPS":
      return process.env.NEXT_PUBLIC_SHOW_MINISTRY_GROUPS === "true";
    default:
      return false;
  }
}
