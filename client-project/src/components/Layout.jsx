import React from "react";
import { useAuth } from "../contexts/AuthContext";
import Logo from "./Pages/images/logo.jpeg";
import Notification from "./Pages/images/Notification.png";
import Navigation from "./Navigation";

export default function Layout({ children, title = "Dashboard" }) {
  const { logout } = useAuth();

  return (
    <div className="bg-gray-100 min-h-screen flex">
      {/* Sidebar */}
      <aside className="sidebar w-64 flex-shrink-0 fixed h-full">
        <div className="p-6">
          <img className="w-24 h-24 text-white p-2" src={Logo} alt="Logo" />
          <Navigation />
          
          <button
            onClick={() => logout()}
            className="btn btn-danger w-full text-left mt-4"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        <header className="page-header p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3d3d3d]">{title}</h2>
          <div className="flex items-center gap-3">
            <img
              className="w-8 h-8 cursor-pointer"
              src={Notification}
              alt="Notifications"
              title="Notifications"
            />
          </div>
        </header>

        <main className="main-content flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
