/**
 * Check if the application is running in demo mode
 * When in demo mode, Supabase auth features should be disabled
 */
export const isDemo = (): boolean => {
  return process.env.NEXT_PUBLIC_DATABASE_MODE === "demo";
};

/**
 * Check if Magic Link authentication is enabled
 */
export const isMagicLinkEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_LOGIN_MAGIC_ENABLED === "true";
};

/**
 * Check if Password authentication is enabled  
 */
export const isPasswordEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED === "true";
};