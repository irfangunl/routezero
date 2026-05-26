import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Key,
  ListOrdered,
  BarChart3,
  Database,
  Activity,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import KeysPage from "@/pages/KeysPage";
import PlaygroundPage from "@/pages/PlaygroundPage";
import FallbackPage from "@/pages/FallbackPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ModelsPage from "@/pages/ModelsPage";
import ProviderStatusPage from "@/pages/ProviderStatusPage";
import BatchTestPage from "@/pages/BatchTestPage";

const queryClient = new QueryClient();

const navItems = [
  { to: "/playground", label: "Playground", icon: LayoutDashboard },
  { to: "/models", label: "Models", icon: Database },
  { to: "/keys", label: "Keys", icon: Key },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/fallback", label: "Fallback", icon: ListOrdered },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/batch-test", label: "Batch Test", icon: FlaskConical },
];

function DarkModeToggle({ collapsed }: { collapsed: boolean }) {
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-fg hover:text-fg hover:bg-surface-hover transition-colors rounded-none"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {!collapsed && <span>{dark ? "Light" : "Dark"}</span>}
    </button>
  );
}

function App() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  function toggleSidebar() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="min-h-screen bg-bg flex">
          {/* Sidebar */}
          <aside
            className={`flex flex-col border-r bg-surface transition-[width] duration-150 ${
              collapsed ? "w-16" : "w-48"
            }`}
          >
            {/* Brand */}
            <div className="flex items-center justify-center py-2 px-3 border-b shrink-0">
              <img
                src="/routezero.png"
                alt="RouteZero"
                className={`${collapsed ? "size-10" : "size-35"} shrink-0`}
              />
            </div>

            {/* Nav */}
            <nav className="flex flex-col py-2 flex-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-accent text-accent-fg"
                        : "text-muted-fg hover:text-fg hover:bg-surface-hover"
                    }`
                  }
                >
                  <item.icon size={16} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="border-t py-1">
              <DarkModeToggle collapsed={collapsed} />
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center w-full px-3 py-2 text-muted-fg hover:text-fg hover:bg-surface-hover transition-colors"
              >
                {collapsed ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronLeft size={16} />
                )}
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/playground" replace />} />
              <Route path="/playground" element={<PlaygroundPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/keys" element={<KeysPage />} />
              <Route path="/status" element={<ProviderStatusPage />} />
              <Route path="/fallback" element={<FallbackPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/batch-test" element={<BatchTestPage />} />
              <Route
                path="/test"
                element={<Navigate to="/playground" replace />}
              />
              <Route path="/health" element={<Navigate to="/keys" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
