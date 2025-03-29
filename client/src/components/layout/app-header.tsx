import { Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AppHeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function AppHeader({ title, onMenuClick }: AppHeaderProps) {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map(name => name[0])
    .join("")
    .toUpperCase();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between h-16 px-4">
        <div className="flex items-center">
          <Button
            onClick={onMenuClick}
            variant="ghost"
            size="icon"
            className="md:hidden -ml-1 mr-3 flex items-center justify-center h-10 w-10 rounded-md text-neutral-500 hover:text-neutral-900 focus:outline-none"
          >
            <span className="material-icons">menu</span>
          </Button>
          <h1 className="text-xl font-poppins font-semibold text-neutral-900">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <div className="hidden md:block border-l border-neutral-200 h-6 mx-2"></div>
          <div className="flex items-center md:hidden">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <span className="text-sm font-medium">{initials}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
