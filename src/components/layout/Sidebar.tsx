import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Building2,
    Settings,
    Users,
    FolderTree,
    KeyRound,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Trash,
    Package,
    HardDrive,
    Monitor,
    UserCheck,
    Shield,
    LogOut,
    UserCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MenuItem {
    title: string;
    path?: string;
    icon: any;
    roles: string[];
    children?: MenuItem[];
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
        title: 'Asset Management',
        icon: Package,
        roles: ['company_super_admin'],
        children: [
            {
                title: 'Dashboard',
                path: '/assets/dashboard',
                icon: LayoutDashboard,
                roles: ['company_super_admin'],
            },
            {
                title: 'Hardware Assets',
                path: '/assets/hardware',
                icon: HardDrive,
                roles: ['company_super_admin'],
            },
            {
                title: 'Software Assets',
                path: '/assets/software',
                icon: Monitor,
                roles: ['company_super_admin'],
            },
        ],
    },
    {
        title: 'My Assets',
        icon: Package,
        roles: ['company_user'],
        children: [
            {
                title: 'Hardware Asset',
                path: '/my-assets/hardware',
                icon: HardDrive,
                roles: ['company_user'],
            },
            {
                title: 'Software Asset',
                path: '/my-assets/software',
                icon: Monitor,
                roles: ['company_user'],
            },
        ],
    },
    {
        title: 'Checkout Process',
        path: '/checkout',
        icon: UserCheck,
        roles: ['company_super_admin'],
    },
    {
        title: 'Passwords',
        path: '/password-creation',
        icon: KeyRound,
        roles: ['company_super_admin', 'company_user'],
    },
    {
        title: 'Trash',
        path: '/trash',
        icon: Trash,
        roles: ['company_super_admin'],
    },
    {
        title: 'Company Settings',
        path: '/company-settings',
        icon: Settings,
        roles: ['company_super_admin'],
    },
];

export const Sidebar = ({
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen
}: {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (v: boolean) => void;
}) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        if (location.pathname.startsWith('/assets')) {
            setExpandedItems(prev =>
                prev.includes('Asset Management') ? prev : [...prev, 'Asset Management']
            );
        }
        if (location.pathname.startsWith('/my-assets')) {
            setExpandedItems(prev =>
                prev.includes('My Assets') ? prev : [...prev, 'My Assets']
            );
        }
    }, [location.pathname]);

    let filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role || ''));

    const toggleExpanded = (title: string) => {
        setExpandedItems(prev =>
            prev.includes(title)
                ? prev.filter(item => item !== title)
                : [...prev, title]
        );
    };

    const renderMenuItem = (item: MenuItem, level: number = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.title);
        const isActive = item.path ? location.pathname === item.path : false;
        const isChildActive = hasChildren && item.children?.some(child =>
            child.path && location.pathname === child.path
        );

        if (hasChildren) {
            return (
                <div key={item.title} className="px-3">
                    <button
                        onClick={() => toggleExpanded(item.title)}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1',
                            (isActive || isChildActive)
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            collapsed && 'justify-center px-0'
                        )}
                    >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">{item.title}</span>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </>
                        )}
                    </button>
                    {!collapsed && isExpanded && item.children && (
                        <div className="ml-6 space-y-1">
                            {item.children.map(child => renderMenuItem(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={item.path} className="px-3">
                <NavLink
                    to={item.path!}
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1',
                            isActive
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            collapsed && 'justify-center px-0'
                        )
                    }
                >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                </NavLink>
            </div>
        );
    };

    const sidebarContent = (
        <div className="flex h-full flex-col bg-white">
            <div className="flex h-16 items-center px-6 gap-3 border-b border-border/50 bg-white sticky top-0 z-10">
                <div className="bg-primary/10 p-2 rounded-xl">
                    <Shield className="h-6 w-6 text-primary" />
                </div>
                {!collapsed && (
                    <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">SecurePro</span>
                )}
            </div>



            <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
                {filteredMenuItems.map(item => renderMenuItem(item))}
            </nav>

        </div>
    );

    return (
        <>
            <aside
                className={cn(
                    'z-40 hidden md:fixed md:left-0 md:top-0 md:h-screen border-r border-border bg-white transition-all duration-300 md:flex flex-col shadow-sm',
                    collapsed ? 'md:w-16' : 'md:w-64'
                )}
            >
                {sidebarContent}
            </aside>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="w-64 bg-white border-r border-border flex flex-col h-full animate-slide-in-left shadow-2xl">
                        {sidebarContent}
                    </div>
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                </div>
            )}
        </>
    );
};