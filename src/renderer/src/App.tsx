import * as Tooltip from '@radix-ui/react-tooltip'
import { ToastProvider } from './components/ui/Toast'
import { AppDataProvider, useAppData } from './features/layout/AppData'
import { Sidebar } from './features/layout/Sidebar'
import { RuntimeProvider } from './features/runtime/RuntimeProvider'
import { TotpProvider } from './features/security/TotpProvider'
import { ProjectPanel } from './features/projects/ProjectPanel'
import { ReposPage } from './features/repos/ReposPage'
import { PortsPage } from './features/ports/PortsPage'
import { ContainersPage } from './features/containers/ContainersPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { EmptyState } from './components/ui/EmptyState'

function Main() {
  const { view, projects } = useAppData()
  let content: React.ReactNode
  if (view.name === 'project') {
    const project = projects.find((p) => p.id === view.id)
    content = project ? <ProjectPanel project={project} /> : <EmptyState title="Tropa não encontrada" />
  } else if (view.name === 'repos') content = <ReposPage />
  else if (view.name === 'ports') content = <PortsPage />
  else if (view.name === 'containers') content = <ContainersPage />
  else content = <SettingsPage />

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="h-10 [-webkit-app-region:drag]" />
        <div className="px-8 pb-10">{content}</div>
      </main>
    </div>
  )
}

export function App() {
  return (
    <Tooltip.Provider>
      <ToastProvider>
        <TotpProvider>
          <RuntimeProvider>
            <AppDataProvider>
              <Main />
            </AppDataProvider>
          </RuntimeProvider>
        </TotpProvider>
      </ToastProvider>
    </Tooltip.Provider>
  )
}
