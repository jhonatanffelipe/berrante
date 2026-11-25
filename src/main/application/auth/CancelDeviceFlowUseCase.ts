import type { DeviceFlowState } from './DeviceFlowState'

export class CancelDeviceFlowUseCase {
  constructor(private readonly state: DeviceFlowState) {}
  async execute(): Promise<void> {
    this.state.current = null
  }
}
