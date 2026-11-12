import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/app/dashboard'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gym-bg flex items-center justify-center p-6 text-right" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-zinc-200 shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-zinc-900 mb-2">عفواً، حدث خطأ غير متوقع</h1>
            <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
              حدث خطأ في النظام أثناء معالجة طلبك. يمكنك إعادة تحميل الصفحة أو العودة إلى لوحة التحكم.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] text-zinc-500 font-mono text-left max-h-24 overflow-y-auto" dir="ltr">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReset}
                startIcon={<RotateCcw className="w-4 h-4" />}
              >
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={this.handleGoHome}
                startIcon={<Home className="w-4 h-4" />}
              >
                لوحة التحكم
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
