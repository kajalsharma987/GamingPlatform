import { useState } from "react";
import { NavLink } from "react-router-dom";
import { getCurrentUser } from "../utils/api";

const menuGroups = [
  {
    roles: ["super_admin", "master", "agent", "client"],
    id: "users",
    title: "User Management",
    links: [
      { to: "/masters", label: "Masters" },
      { to: "/agents", label: "Agents" },
      { to: "/clients", label: "Clients" },
      { to: "/users", label: "Create User" },
      { to: "/user-list", label: "User List" }
    ]
  },
  {
    roles: ["super_admin", "master", "agent", "client"],
    id: "betting",
    title: "Betting & Games",
    links: [
      { to: "/matches", label: "Live Matches" },
      { to: "/market", label: "Cricket Market" },
      { to: "/bets", label: "Current Bets" },
      { to: "/matka", label: "Matka Live" },
      { to: "/aviator", label: "Aviator Live" }
    ]
  },
  {
    roles: ["super_admin", "master", "agent", "client"],
    id: "coins",
    title: "Coins",
    links: [
      { to: "/wallet", label: "Deposit / Withdraw" },
      { to: "/history", label: "Coin History" },
      { to: "/change-password", label: "Change Password" }
    ]
  },
  {
    roles: ["super_admin", "master", "agent"],
    id: "ledger",
    title: "Ledger",
    links: [
      { to: "/ledger", label: "My Ledger" },
      { to: "/ledger-master", label: "Master Ledger" },
      { to: "/ledger-all", label: "All Master Ledger" },
      { to: "/profit", label: "Total Profit" }
    ]
  },
  {
    roles: ["super_admin", "master", "agent"],
    id: "reports",
    title: "Reports",
    links: [
      { to: "/reports", label: "All Reports" },
      { to: "/settlement", label: "Settlement" }
    ]
  },
  {
    roles: ["super_admin"],
    id: "settings",
    title: "Settings",
    links: [
      { to: "/settings/logo", label: "Logo Change" },
      { to: "/settings/site", label: "Site Settings" },
      { to: "/settings/icons", label: "Image Upload" },
      { to: "/change-password", label: "Change Password" }
    ]
  }
];

function Sidebar() {
  const [open, setOpen] = useState("betting");
  const user = getCurrentUser();
  const role = user?.role || "client";
  const portalNames = {
    super_admin: ["IPL Super Admin", "Full control panel"],
    master: ["Master Portal", "Agents and client panel"],
    agent: ["Agent Portal", "Client operations"],
    client: ["User Portal", "Games and coin requests"]
  };
  const [portalTitle, portalSubtitle] = portalNames[role] || portalNames.client;
  const allowedGroups = menuGroups
    .filter((group) => group.roles.includes(role))
    .map((group) => {
      if (role === "master") {
        return { ...group, links: group.links.filter((link) => !["/masters", "/ledger-all", "/settings/logo", "/settings/site", "/settings/icons"].includes(link.to)) };
      }
      if (role === "agent") {
        return { ...group, links: group.links.filter((link) => !["/masters", "/agents", "/ledger-master", "/ledger-all", "/profit", "/settings/logo", "/settings/site", "/settings/icons"].includes(link.to)) };
      }
      if (role === "client") {
        return { ...group, links: group.links.filter((link) => ["/matches", "/market", "/bets", "/matka", "/aviator", "/wallet", "/history"].includes(link.to)) };
      }
      return group;
    })
    .filter((group) => group.links.length);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">IP</div>
        <div>
          <strong>{portalTitle}</strong>
          <span>{portalSubtitle}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Dashboard
        </NavLink>

        {allowedGroups.map((group) => (
          <div className="nav-group" key={group.id}>
            <button className="nav-group-title" onClick={() => setOpen(open === group.id ? "" : group.id)}>
              <span>{group.title}</span>
              <span>{open === group.id ? "-" : "+"}</span>
            </button>

            {open === group.id && (
              <div className="nav-submenu">
                {group.links.map((link) => (
                  <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-sublink ${isActive ? "active" : ""}`}>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
