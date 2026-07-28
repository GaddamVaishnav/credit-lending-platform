// ============================================================
// Central API Configuration
// Change ENV here to switch between local and production
// ============================================================

type Env = 'local' | 'production';

const ENV: Env = 'production'; // ← Change to 'production' for AWS

const BASE: Record<Env, string> = {
  local:      '',                     // uses Angular proxy / nginx
  production: 'https://creditplatform.duckdns.org'  // direct EC2 IP
};

const BASE_URL = BASE[ENV];

export const API = {
  ONBOARDING:   `${BASE_URL}/api/v1`,
  LOAN:         `${BASE_URL}/api/loan/api/v1`,
  REPAYMENT:    `${BASE_URL}/api/repayment/api/v1`,
  NOTIFICATION: `${BASE_URL}/api/notification/api/v1`,
  DISBURSEMENT: `${BASE_URL}/api/disbursement/api/v1`,
  GATEWAY:      `${BASE_URL}/api/gateway/api/v1`,
};
