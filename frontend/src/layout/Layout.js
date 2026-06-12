import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { getCurrentUser } from "../utils/api";

function Layout({ children }) {
  const user = getCurrentUser();

  return (
    <div className={`app-shell portal-${user?.role || "client"}`}>
      <Sidebar />

      <div className="main-shell">
        <Navbar />

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
