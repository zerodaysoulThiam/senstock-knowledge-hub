import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Brain,
  BarChart3,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: MessageSquare, label: "Chat IA", path: "/chat" },
  { icon: FileText, label: "Documents", path: "/documents" },
  { icon: Users, label: "Utilisateurs", path: "/users" },
  { icon: BarChart3, label: "Statistiques", path: "/stats" },
  { icon: Settings, label: "Paramètres", path: "/settings" },
];

interface AppSidebarProps {
  onLogout: () => void;
}

const AppSidebar = ({ onLogout }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`senstock-sidebar flex flex-col h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
          <Brain className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-display text-lg font-bold text-sidebar-foreground leading-tight">
              SenStock
            </h1>
            <p className="text-xs text-sidebar-foreground/60">AI Brain</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
              {!collapsed && (
                <span className="text-sm font-medium animate-fade-in">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:text-destructive hover:bg-sidebar-accent transition-all w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Déconnexion</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
