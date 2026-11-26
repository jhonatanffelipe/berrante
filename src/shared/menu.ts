/** Comandos que o menu nativo envia ao renderer pelo evento `menu:command`. */
export type MenuCommand =
  | { type: 'go'; view: 'repos' | 'ports' | 'containers' | 'settings' }
  | { type: 'project'; id: string }
  | { type: 'newProject' }
  | { type: 'editProject' }
  | { type: 'openWorkspace' }
  | { type: 'play' }
  | { type: 'stop' }
  | { type: 'tab'; tab: 'boiada' | 'containers' | 'plano' }
