import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">SecurePro</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">{title}</span>
          </div>

          <div className="flex items-center gap-4">
            {user && <span className="text-sm text-muted-foreground">{user.email}</span>}
            {/* Hamburger for mobile sidebar */}
            <button className="md:hidden rounded-lg p-2 hover:bg-accent" onClick={() => setSidebarMobileOpen(true)} aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        setMobileOpen={setSidebarMobileOpen}
      />

      <main
        className={`mt-16 p-6 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} md:block`}
      >
        {children}
      </main>
    </div>
  );
};
