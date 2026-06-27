import { Sidebar } from "@/components/app/sidebar";

/** ダッシュボードのレイアウト枠（サイドバー + コンテンツ）。 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
