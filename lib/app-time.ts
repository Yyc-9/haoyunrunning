/**
 * Internal calculations use the IANA time-zone identifier so daylight-saving
 * and server formatting APIs remain correct. Public UI uses the concise UTC
 * offset label requested by the site owner.
 */
export const APP_TIME_ZONE = 'Asia/Taipei' as const
export const APP_TIME_ZONE_LABEL = 'UTC+8' as const
export const APP_UTC_OFFSET = '+08:00' as const

