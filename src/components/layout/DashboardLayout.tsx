import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { Menu, ChevronLeft, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  header?: ReactNode;
  footer?: ReactNode;
  mainClassName?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, header, footer, mainClassName }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-[#1A1A1A]">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        setMobileOpen={setSidebarMobileOpen}
      />

      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden relative transition-all duration-300 bg-[#F8FAFC]",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        {/* Main Header Container */}
        <header className="flex-none bg-white z-20 sticky top-0 border-b border-border/40">
          <div className="flex flex-col">
            {/* Top Row: Navigation & User Actions */}
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <button
                  className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg"
                  onClick={() => setSidebarMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-4">
                  <div
                    className="bg-[#4F46E5] p-2 rounded-lg cursor-pointer hover:bg-[#4338CA] transition-all shadow-sm flex items-center justify-center group"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  >
                    <ChevronLeft className={cn("h-5 w-5 text-white transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-[#1A1A1A]">{title}</h1>
                </div>
              </div>

              {/* Right Side: User Info and Logout */}
              <div className="flex items-center gap-4">
                {user && (
                  <div className="flex items-center">
                    {/* User Info Block */}
                    <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
                      <div
                        className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-blue-100 flex-shrink-0 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => navigate('/profile')}
                        title="View Profile"
                      >
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col group relative">
                        <span className="text-sm font-semibold text-[#1A1A1A] leading-none">
                          {user.name || user.email?.split('@')[0]}
                        </span>
                        <span className="text-[10px] tracking-wider font-medium text-slate-400 mt-1 capitalize">
                          {user.role?.replace(/_/g, ' ')}
                        </span>
                        {/* Email tooltip on hover */}
                        <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 bg-slate-800 text-white text-xs px-3 py-2 rounded-md shadow-lg whitespace-nowrap">
                          {user.email}
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <div className="flex items-center gap-3 pl-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="hover:bg-slate-100 p-2 rounded-full transition-colors group">
                            <LogOut className="h-5 w-5 text-slate-400 group-hover:text-rose-600 transition-colors" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sub Header Row: Filters and Specific Actions (Optional) */}
            {header && (
              <div className="px-6 py-4 border-t border-border/40 bg-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)]">
                {header}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Main Content Area */}
        <main className={cn("flex-1 overflow-auto p-6 scroll-smooth", mainClassName)}>
          {children}
        </main>

        {/* Sticky Global Footer Area (Optional) */}
        {footer && (
          <footer className="flex-none bg-white border-t border-border/50 z-20 sticky bottom-0">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
