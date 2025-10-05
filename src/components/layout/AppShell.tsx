import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-screen-md flex-1 px-4 pb-24 pt-4 sm:pb-6">
        <Outlet />
      </main>
    </div>
  );
}
