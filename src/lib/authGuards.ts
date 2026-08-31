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
