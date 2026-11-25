/** O device_code nunca sai do main process. */
export class DeviceFlowState {
  current: { deviceCode: string; verificationUri: string; expiresAt: number; interval: number } | null = null
}
