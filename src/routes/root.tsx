import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/app/sidebar";

/** App shell: sidebar + routed content. Mirrors the former dashboard layout. */
export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
