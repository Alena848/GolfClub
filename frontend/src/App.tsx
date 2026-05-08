import { Link, NavLink, Route, Routes } from "react-router-dom";
import { ClipboardList, HomeIcon, LayoutDashboard, Users } from "lucide-react";

import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import MembersPage from "./pages/MembersPage";
import WaitlistPage from "./pages/WaitlistPage";

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">GC</span>
          <span>Golf Club Membership</span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink to="/" end>
            <HomeIcon size={18} />
            Home
          </NavLink>
          <NavLink to="/admin">
            <LayoutDashboard size={18} />
            Admin
          </NavLink>
          <NavLink to="/members">
            <Users size={18} />
            Members
          </NavLink>
          <NavLink to="/waitlist">
            <ClipboardList size={18} />
            Waitlist
          </NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
