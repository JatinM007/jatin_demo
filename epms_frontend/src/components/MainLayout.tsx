import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useWebSocket } from "../hooks/useWebSocket";

const MainLayout = () => {
  useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8f6ff]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — always visible on md+, drawer on mobile */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 md:static md:z-auto md:translate-x-0 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: "16px 20px" }}
        >
          <div className="max-w-full md:px-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
