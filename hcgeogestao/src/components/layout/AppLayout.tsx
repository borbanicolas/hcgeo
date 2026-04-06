import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import hcgeoLogo from "@/assets/hcgeo-logo-sidebar.png";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  HardHat,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Drill,
  Package,
  UserCheck,
  DollarSign,
  LogOut,
  Shield,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/clientes", label: "Clientes", icon: Building2 },
  { path: "/propostas", label: "Propostas", icon: FileText },
  { path: "/obras", label: "Obras & Medições", icon: HardHat },
  { path: "/estoque", label: "Estoque & Fornecedores", icon: Package },
  { path: "/colaboradores", label: "RH & Administrativo", icon: UserCheck },
  { path: "/financeiro", label: "Financeiro", icon: DollarSign, adminAndFin: true },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
  { 
    label: "Painel Admin", 
    icon: Shield, 
    adminRootOnly: true,
    subItems: [
      { path: "/usuarios", label: "Usuários" },
      { path: "/auditoria", label: "Logs do Sistema" }
    ]
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(true);
  const location = useLocation();
  const { session, signOut } = useAuth();
  const userRole = session?.user?.role || 'user';

  const visibleNavItems = navItems.filter(item => {
    if (item.adminAndFin && (userRole !== 'admin' && userRole !== 'financeiro')) {
      return false;
    }
    if (item.adminRootOnly && userRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 lg:static
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden">
            <img src={hcgeoLogo} alt="HCGEO" className="h-9 w-9 object-cover" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">HCGEO</span>
              <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">GESTÃO</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden text-sidebar-foreground/60 hover:text-sidebar-foreground lg:block"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
          {visibleNavItems.map((item, idx) => {
            if (item.subItems) {
              const Icon = item.icon;
              return (
                <div key={idx} className="space-y-1">
                  <button
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    className={`nav-item flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown className={`h-4 w-4 transition-transform ${adminMenuOpen ? "rotate-180" : ""}`} />
                    )}
                  </button>
                  
                  {adminMenuOpen && !collapsed && (
                    <div className="ml-9 border-l border-sidebar-border pl-3 space-y-1">
                      {item.subItems.map(sub => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex block w-full rounded-md px-3 py-2 text-sm transition-colors ${
                              isSubActive 
                                ? "bg-sidebar-accent text-sidebar-primary font-medium" 
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.path || 
              (item.path !== "/" && location.pathname.startsWith(item.path!));
            const Icon = item.icon;
            return (
              <Link
                key={item.path || idx}
                to={item.path!}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-sidebar-border p-4">
          <button
            onClick={() => signOut()}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive
              ${collapsed ? "justify-center" : ""}
            `}
            title={collapsed ? "Sair do sistema" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair do sistema</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
