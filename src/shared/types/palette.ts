/** Cores da paleta Dracula usadas como "peças". O hex mora só no tema (renderer) — aqui é só o nome. */
export const DRACULA_ACCENTS = ['cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'] as const
export type DraculaAccent = (typeof DRACULA_ACCENTS)[number]

/** Formatos de bloco de 4 quadrados usados como ícone de Tropa. */
export const BLOCK_SHAPES = ['bar', 'square', 'tee', 'ell', 'jay', 'ess', 'zed'] as const
export type BlockShape = (typeof BLOCK_SHAPES)[number]
