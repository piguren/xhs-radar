import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorCard } from './ErrorCard';

interface Props {
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * 全局错误兜底（对应 docs/prd/xhs-radar-l3.md §7.2 + AC-044）
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[xhs-radar] uncaught', error, info);
    this.props.onError?.(error, info);
    // TODO [PHASE 2]: 用户可选开启错误上报
  }

  private copyDetail = (): void => {
    if (!this.state.error) return;
    void navigator.clipboard.writeText(this.state.error.stack ?? this.state.error.message);
  };

  private reload = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="m-6">
          <ErrorCard
            title="出现意外错误"
            message={this.state.error.message}
            detail={this.state.error.stack ?? undefined}
            actions={[
              { label: '复制错误信息', onClick: this.copyDetail },
              { label: '继续', onClick: this.reload, variant: 'primary' },
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
