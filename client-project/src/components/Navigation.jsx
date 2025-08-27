import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

/**
 * Active link styles:
 * - orange background
 * - white text
 * - bold
 */
function itemClass(isActive) {
  return [
    "nav-item",
    isActive ? "active" : "",
  ].join(" ");
}

export default function Navigation() {
  const { pathname } = useLocation();
  const [openMobile, setOpenMobile] = useState(false);

  const items = [
    { to: "/home", label: "Home" },
    { to: "/customer", label: "Customers" },
    { to: "/invoice", label: "Invoice" },
    { to: "/pending", label: "Pending" },
    { to: "/employeetask", label: "Employee Task" },
    { to: "/employeedetails", label: "Employee Details" },
    { to: "/income", label: "Income" },
    { to: "/expenses", label: "Expenses" },
    { to: "/employeesalary", label: "Employee Salary" },
    { to: "/report", label: "Report" },
    // { to: "/signin", label: "Sign in" }, // usually hidden once logged in
  ];

  return (
    <nav className="text-sm">
      {/* Mobile toggle (hidden on desktop, visible if you decide to use it) */}
      <button
        className="md:hidden mb-3 border px-3 py-2 rounded"
        onClick={() => setOpenMobile((v) => !v)}
      >
        {openMobile ? "Close Menu" : "Menu"}
      </button>

      <ul className={`space-y-1 ${openMobile ? "block" : "hidden md:block"}`}>
        {items.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} className={({ isActive }) => itemClass(isActive)}>
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Context hint: show where we are */}
      <div className="text-[11px] text-gray-400 mt-4 break-all">
        Current: <span className="font-mono">{pathname}</span>
      </div>
    </nav>
  );
}
