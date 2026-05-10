import { ConfigPage } from '@/app/routes/ConfigPage';
import { ToastContainer } from '@/app/components/shared/ToastContainer';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { ScrapeProgressBridge } from '@/app/components/ScrapeProgressBridge';
import { BottomStatusBar } from '@/app/components/nav/BottomStatusBar';
import { useScrapeStore } from '@/app/store/scrapeStore';

/**
 * 占位顶层 — Phase 1.12 会替换为完整 TopNav + 路由分发 + ModalRoot
 * 当前已挂：ScrapeProgressBridge（SW → store 进度桥）+ BottomStatusBar（store → UI）
 */
export default function App(): React.ReactElement {
  const status = useScrapeStore((s) => s.status);
  const progress = useScrapeStore((s) => s.progress);

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-neutral-50">
        <ScrapeProgressBridge />
        <ConfigPage />
        <ToastContainer />
        <BottomStatusBar
          status={status}
          progress={{
            candidateCount: progress.candidateCount,
            bombCount: progress.bombCount,
            detailFetchedCount: progress.detailFetchedCount,
            currentKeyword: progress.currentKeyword,
          }}
        />
      </main>
    </ErrorBoundary>
  );
}
