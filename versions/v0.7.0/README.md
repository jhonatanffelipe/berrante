O Berrante chega ao Windows (x64 e ARM64) e segue no macOS (Apple Silicon e Intel). Primeira instalação? Siga o
[guia de instalação](https://github.com/jhonatanffelipe/berrante/blob/main/docs/guia-instalacao.md).

## Downloads

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| macOS · Apple Silicon (M1 ou mais novo) | [Berrante-0.7.0-mac-arm64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.7.0/Berrante-0.7.0-mac-arm64.dmg) | 117 MB |
| macOS · Intel | [Berrante-0.7.0-mac-x64.dmg](https://github.com/jhonatanffelipe/berrante/releases/download/v0.7.0/Berrante-0.7.0-mac-x64.dmg) | 124 MB |
| Windows 10/11 · x64 (Intel/AMD, a maioria dos PCs) | [Berrante-0.7.0-win-x64.exe](https://github.com/jhonatanffelipe/berrante/releases/download/v0.7.0/Berrante-0.7.0-win-x64.exe) | 124 MB |
| Windows 11 · ARM64 (Snapdragon, Surface Pro X…) | [Berrante-0.7.0-win-arm64.exe](https://github.com/jhonatanffelipe/berrante/releases/download/v0.7.0/Berrante-0.7.0-win-arm64.exe) | 118 MB |

Os `.zip` têm o mesmo app sem instalador: no Mac (`-mac-arm64.zip`, `-mac-x64.zip`) é o `.app`; no Windows
(`-win-x64.zip`, `-win-arm64.zip`), descompacte e abra o `Berrante.exe`.

**Instale certo no Mac:** abra o `.dmg`, **arraste o Berrante para Aplicativos**, ejete o volume e abra pela pasta
Aplicativos. Num Mac Apple Silicon, use o `mac-arm64`: a versão Intel roda pelo Rosetta e fica bem mais lenta.

O app do Mac é assinado ad-hoc, mas não é notarizado: na primeira vez, vá em **Ajustes do Sistema → Privacidade e
Segurança → Abrir Mesmo Assim**. Se pedir o Chaveiro ("Berrante Safe Storage"), clique em **Sempre permitir**. Roda
no macOS 12 ou mais novo.

**Instale certo no Windows:** rode o `.exe` da sua arquitetura (**Configurações → Sistema → Sobre → Tipo de
sistema**). Ele instala só para o seu usuário, sem pedir administrador. Num Windows ARM, use o `win-arm64`: a versão
x64 roda pela emulação e fica mais lenta (o Berrante avisa).

O app não é assinado: na primeira vez o SmartScreen mostra "O Windows protegeu o computador". Clique em
**Mais informações → Executar assim mesmo**.

Precisa do [Git for Windows](https://git-scm.com/download/win): o Berrante roda os passos no Git Bash, com os mesmos
comandos do macOS. Windows 32 bits não é suportado (o Electron não publica mais essa versão).

### SHA-256

```
13985e6cde3c19545629b27b40ea1b952ea8de067b26d25404cf4e3747bd8aa4  Berrante-0.7.0-mac-arm64.dmg
4da8462884eeee2851c5c28fe6441564fdf6532c1213e3f89cf1e53aea6a42ac  Berrante-0.7.0-mac-x64.dmg
c7c121c099bb3697adac592b332c8a343efcc7350f0534e9750fab26ec3e5bcf  Berrante-0.7.0-mac-arm64.zip
118eca1767619b599ffa55f818bc9df321700b251c3fc2bdb0a8fbf207636e5a  Berrante-0.7.0-mac-x64.zip
a0f24638143c8ac690057e1dbed95dab8b9e890073e4bf2571ca6d48aa140b35  Berrante-0.7.0-win-x64.exe
4e40368a769dcb56870c435479556a997ace44ee01c0f9e48aca5f9d6ebdbd11  Berrante-0.7.0-win-arm64.exe
117d3b4e6c66a6c501ff2745ee732181e27850ab88900eef474c38f6ef1796af  Berrante-0.7.0-win-x64.zip
4c1d193f7093d187380eaeadf5a8a73bc03312fbeec5480e545f69e817ef82ce  Berrante-0.7.0-win-arm64.zip
```

Conferir: `shasum -a 256 <arquivo>` no Mac, ou `Get-FileHash <arquivo> -Algorithm SHA256` no PowerShell.

## Mudanças

- **Windows 10/11:** instaladores `.exe` (por usuário) e `.zip` para x64 e ARM64.
- **Passos no Git Bash:** os mesmos comandos do plano (`&&`, `cp`, `>/dev/null`) funcionam no Windows e no macOS;
  sem Git Bash, os passos caem no Prompt de Comando.
- **Recolher a boiada:** no Windows, a árvore de processos de cada serviço é encerrada (`taskkill /T /F`).
- **Contar a boiada:** portas pelo `netstat` e processos pelo PowerShell, com a tropa dona de cada porta. A coluna de
  pasta fica vazia no Windows, que não informa a pasta de outro processo.
- **Terminal na pasta:** Windows Terminal (padrão), PowerShell, Prompt de Comando ou Git Bash.
- **VS Code:** abre o `Code.exe` da instalação do usuário ou do sistema.
- **No Windows:** ícone na área de notificação (fechar a janela não derruba a boiada), menus Arquivo/…/Ajuda na
  janela, atalhos com `Ctrl` e token cifrado pelo cofre do Windows (DPAPI).
- **macOS:** atalhos passam a ser `CmdOrCtrl` por dentro; no Mac continuam `⌘`. Nada mais muda.

## Atualizando da 0.6.2

No Mac, substitua o app em **Aplicativos** pelo da 0.7.0. As tropas, os workflows
e as configurações são mantidos, e nada muda no formato dos dados. No Windows é a primeira versão: basta instalar.

Detalhes no [CHANGELOG](https://github.com/jhonatanffelipe/berrante/blob/main/CHANGELOG.md).
