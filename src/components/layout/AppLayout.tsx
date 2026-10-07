import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <div className="app-layout">
      <AppSidebar />

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}