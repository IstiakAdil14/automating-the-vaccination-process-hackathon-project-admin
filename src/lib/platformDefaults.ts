export const DEFAULT_PLATFORM_CONFIG: Record<string, number> = {
  otp_expiry_minutes:          5,
  appointment_cancel_hours:    24,
  walkin_quota_percent:        20,
  session_timeout_minutes:     30,
  max_login_attempts:          5,
  lockout_duration_minutes:    15,
  failed_otp_attempts_block:   3,
};
