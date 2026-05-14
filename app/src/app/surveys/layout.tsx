import Sidebar from '@/components/Sidebar';

export default function SurveysLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
