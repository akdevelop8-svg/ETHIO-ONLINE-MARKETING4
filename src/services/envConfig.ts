/**
 * EOM Environment Configuration & Secrets Boundary
 * Phase 0 - 8: Platform Configuration
 */

export interface EOMEnvironmentConfig {
  appUrl: string;
  isProduction: boolean;
  currency: 'ETB';
  supportTelegramUrl: string;
  botTelegramUrl: string;
  admin1TelegramUrl: string;
  admin2TelegramUrl: string;
  maxUploadSizeBytes: number;
}

export const getEnvironmentConfig = (): EOMEnvironmentConfig => {
  const env = (import.meta as unknown as { env?: Record<string, string | boolean> }).env;
  return {
    appUrl: (env?.VITE_APP_URL as string) || (typeof window !== 'undefined' ? window.location.origin : ''),
    isProduction: Boolean(env?.PROD),
    currency: 'ETB',
    supportTelegramUrl: 'https://t.me/eom3_bot',
    botTelegramUrl: 'https://t.me/eom3_bot',
    admin1TelegramUrl: 'https://t.me/mr_ebek',
    admin2TelegramUrl: 'https://t.me/EXO_SMM',
    maxUploadSizeBytes: 1024 * 1024 // 1MB limit for verification screenshots
  };
};

export const validateServerEnvironment = (): { isValid: boolean; missingVariables: string[] } => {
  const missing: string[] = [];
  return {
    isValid: missing.length === 0,
    missingVariables: missing
  };
};
