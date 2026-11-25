import type { BerranteApi } from '../shared/ipc/contract'

declare global {
  interface Window {
    berrante: BerranteApi
  }
}

export {}
