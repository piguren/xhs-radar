import { ConfigPage } from '@/app/routes/ConfigPage';
import { ToastContainer } from '@/app/components/shared/ToastContainer';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

/**
 * 占位顶层 — Phase 1.12 会替换为完整 TopNav + 路由分发 + BottomStatusBar + ModalRoot
 */
export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-neutral-50">
        <ConfigPage />
        <ToastContainer />
      </main>
    </ErrorBoundary>
  );
}
