import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  Settings, 
  Users, 
  FolderTree, 
  KeyRound,
  BookOpen, 
  Key,
  ChevronLeft,
  ChevronRight,
  Trash
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  path: string;
  icon: any;
  roles: string[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['master_admin', 'company_super_admin', 'company_user'],
  },
  {
    title: 'Companies',
    path: '/companies',
    icon: Building2,
    roles: ['master_admin'],
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: ['master_admin'],
  },
  {
    title: 'Users',
    path: '/users',
    icon: Users,
    roles: ['company_super_admin'],
  },
  {
    title: 'Organization',
    path: '/organization',
    icon: Key,
    roles: ['company_super_admin'],
  },
   {
    title: 'Collections',
    path: '/collections',
    icon: BookOpen,
    roles: ['company_super_admin'],
  },
  {
    title: 'Folders',
    path: '/folders',
    icon: FolderTree,
    roles: ['company_super_admin'],
  },
 
 {
  title: 'Password Creation',
  path: '/password-creation',
  icon: KeyRound,
  roles: ['company_super_admin'],
},

{
  title: 'Trash',
  path: '/trash',
  icon: Trash,
  roles: ['company_super_admin'],
}
];

export const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || '')
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-end p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 hover:bg-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2">
          {filteredMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};