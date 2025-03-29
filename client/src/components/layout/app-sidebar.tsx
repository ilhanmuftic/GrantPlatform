import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map(name => name[0])
    .join("")
    .toUpperCase();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: "dashboard",
      roles: ["administrator", "applicant", "reviewer", "donor"],
    },
    {
      name: "Applications",
      path: "/applications",
      icon: "description",
      roles: ["administrator", "applicant", "reviewer", "donor"],
    },
    {
      name: "Messages",
      path: "/messages",
      icon: "mail",
      roles: ["administrator", "applicant", "reviewer", "donor"],
    },
    {
      name: "Reports",
      path: "/reports",
      icon: "assessment",
      roles: ["administrator", "reviewer", "donor"],
    },
    {
      name: "Budget",
      path: "/budget",
      icon: "attach_money",
      roles: ["administrator", "reviewer", "donor"],
    },
    {
      name: "Documents",
      path: "/documents",
      icon: "folder",
      roles: ["administrator", "applicant", "reviewer", "donor"],
    },
    {
      name: "Admin",
      path: "/admin",
      icon: "settings",
      roles: ["administrator"],
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className="flex flex-col w-64 border-r border-neutral-200 h-full">
      {/* Logo Area */}
      <div className="h-16 flex items-center border-b border-neutral-200 px-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="material-icons text-white text-sm">volunteer_activism</span>
          </div>
          <span className="font-poppins text-lg font-semibold text-neutral-800">Grant Portal</span>
        </div>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-2 space-y-1">
          {filteredNavItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive(item.path) 
                  ? "bg-primary text-white" 
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}>
                <span className={`material-icons mr-3 ${
                  isActive(item.path) ? "text-white" : "text-neutral-500"
                }`}>
                  {item.icon}
                </span>
                {item.name}
              </a>
            </Link>
          ))}
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <span className="text-sm font-medium">{initials}</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-neutral-800">{user.fullName}</p>
            <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
          </div>
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            size="icon" 
            className="ml-auto p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
