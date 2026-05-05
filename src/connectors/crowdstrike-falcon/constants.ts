export const DEFAULT_BASE_URL = 'https://api.example.com'

export const API_PATHS = {
  HEALTH: '/health',
  GET_DETECTIONS: '/get-detections',
  GET_DETECTION_DETAILS: '/get-detection-details',
  GET_INCIDENTS: '/get-incidents',
  GET_DEVICES: '/get-devices',
  GET_DEVICE_DETAILS: '/get-device-details',
  GET_ALERTS: '/get-alerts',
  GET_VULNERABILITIES: '/get-vulnerabilities',
  ISOLATE_DEVICE: '/isolate-device',
} as const
