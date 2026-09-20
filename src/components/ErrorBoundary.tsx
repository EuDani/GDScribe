import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GDScribe] Erro não tratado:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center text-canvas-fg">
          <AlertTriangle size={32} className="text-accent-red" />
          <div>
            <h1 className="text-display text-xl">Algo deu errado</h1>
            <p className="mt-2 max-w-md text-sm text-canvas-fg/60">{this.state.error.message}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Recarregar</Button>
        </div>
      )
    }
    return this.props.children
  }
}
