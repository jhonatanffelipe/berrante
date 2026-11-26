#!/bin/bash
# wsl.exe falso para testes no macOS/Linux. Imita o que o Berrante usa do real:
#   wsl.exe -l -v                                  → lista de distros
#   wsl.exe [-d <distro>] [--cd <dir>] --exec …    → executa o argv dentro da "distro"
# Como no real, só atravessam para o "Linux" as variáveis listadas no WSLENV (o resto do ambiente do
# Windows fica de fora), e `setsid` é trocado por um equivalente em Python (o macOS não tem setsid).
if [ "$1" = "-l" ]; then
  printf '  NAME              STATE           VERSION\n* FakeDistro        Running         2\n  docker-desktop    Running         2\n  Other             Stopped         2\n'
  exit 0
fi
dir=""
while [ $# -gt 0 ]; do
  case "$1" in
    -d) [ "$2" = "FakeDistro" ] || { echo "distro inexistente: $2" >&2; exit 1; }; shift 2 ;;
    --cd) dir="$2"; shift 2 ;;
    --exec) shift; break ;;
    *) echo "argumento inesperado: $1" >&2; exit 64 ;;
  esac
done
[ "$dir" = "~" ] && dir="$HOME"
if [ -n "$dir" ]; then cd "$dir" || exit 1; fi
pass=(HOME="$HOME" USER="$USER" LOGNAME="$USER" PATH="/usr/bin:/bin:/usr/sbin:/sbin" TMPDIR="${TMPDIR:-/tmp}")
IFS=':' read -r -a names <<< "${WSLENV:-}"
for n in "${names[@]}"; do
  key="${n%%/*}"
  [ -n "$key" ] && [ -n "${!key+x}" ] && pass+=("$key=${!key}")
done
if [ "$1" = "/usr/bin/setsid" ]; then
  shift
  [ "$1" = "-w" ] && shift
  # Como o `setsid -w` real: se já for líder de grupo, cria um filho na sessão nova e espera por ele.
  exec env -i "${pass[@]}" python3 -c '
import os, sys
if os.getpgrp() == os.getpid():
    pid = os.fork()
    if pid:
        _, status = os.waitpid(pid, 0)
        sys.exit(os.waitstatus_to_exitcode(status) & 0xFF)
os.setsid()
os.execvp(sys.argv[1], sys.argv[1:])
' "$@"
fi
exec env -i "${pass[@]}" "$@"
