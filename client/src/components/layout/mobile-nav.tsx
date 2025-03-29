import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

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
      name: "More",
      path: "/more",
      icon: "more_horiz",
      roles: ["administrator", "applicant", "reviewer", "donor"],
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-20">
      <div className="flex justify-around">
        {filteredNavItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a className={`flex flex-col items-center py-2 px-3 ${
              isActive(item.path) ? "text-primary" : "text-neutral-500"
            }`}>
              <span className="material-icons text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.name}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
