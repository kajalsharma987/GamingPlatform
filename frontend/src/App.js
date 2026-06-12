import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import Layout from "./layout/Layout";
import PrivateRoute from "./components/PrivateRoute";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import CreateUser from "./pages/users/CreateUser";
import UserList from "./pages/users/UserList";
import Masters from "./pages/users/Masters";
import Agents from "./pages/users/Agents";
import Clients from "./pages/users/Clients";
import Wallet from "./pages/wallet/Wallet";
import History from "./pages/wallet/History";
import Ledger from "./pages/wallet/Ledger";
import Matches from "./pages/matches/Matches";
import Market from "./pages/matches/Market";
import Bets from "./pages/betting/Bets";
import Matka from "./pages/games/Matka";
import Aviator from "./pages/games/Aviator";
import Casino from "./pages/games/Casino";
import Reports from "./pages/reports/Reports";
import Settlement from "./pages/settlement/Settlement";
import Settings from "./pages/settings/Settings";
import Logo from "./pages/settings/Logo";
import IconUpload from "./pages/settings/IconUpload";
import ChangePassword from "./pages/settings/ChangePassword";

function ProtectedPage({ children }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />

        <Route path="/users" element={<ProtectedPage><CreateUser /></ProtectedPage>} />
        <Route path="/user-list" element={<ProtectedPage><UserList /></ProtectedPage>} />
        <Route path="/masters" element={<ProtectedPage><Masters /></ProtectedPage>} />
        <Route path="/agents" element={<ProtectedPage><Agents /></ProtectedPage>} />
        <Route path="/clients" element={<ProtectedPage><Clients /></ProtectedPage>} />

        <Route path="/wallet" element={<ProtectedPage><Wallet /></ProtectedPage>} />
        <Route path="/history" element={<ProtectedPage><History /></ProtectedPage>} />
        <Route path="/ledger" element={<ProtectedPage><Ledger /></ProtectedPage>} />
        <Route path="/ledger-master" element={<ProtectedPage><Ledger /></ProtectedPage>} />
        <Route path="/ledger-all" element={<ProtectedPage><Ledger /></ProtectedPage>} />

        <Route path="/matches" element={<ProtectedPage><Matches /></ProtectedPage>} />
        <Route path="/market" element={<ProtectedPage><Market /></ProtectedPage>} />
        <Route path="/market/:id" element={<ProtectedPage><Market /></ProtectedPage>} />
        <Route path="/bets" element={<ProtectedPage><Bets /></ProtectedPage>} />
        <Route path="/matka" element={<ProtectedPage><Matka /></ProtectedPage>} />
        <Route path="/aviator" element={<ProtectedPage><Aviator /></ProtectedPage>} />
        <Route path="/casino" element={<ProtectedPage><Casino /></ProtectedPage>} />

        <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
        <Route path="/profit" element={<ProtectedPage><Reports /></ProtectedPage>} />
        <Route path="/settlement" element={<ProtectedPage><Settlement /></ProtectedPage>} />

        <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
        <Route path="/settings/site" element={<ProtectedPage><Settings /></ProtectedPage>} />
        <Route path="/settings/logo" element={<ProtectedPage><Logo /></ProtectedPage>} />
        <Route path="/settings/icons" element={<ProtectedPage><IconUpload /></ProtectedPage>} />
        <Route path="/change-password" element={<ProtectedPage><ChangePassword /></ProtectedPage>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
