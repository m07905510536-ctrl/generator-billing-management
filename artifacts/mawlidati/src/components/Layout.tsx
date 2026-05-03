import React, { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLogout } from "@workspace/api-client-react";
import { ThemeToggle } from "./ThemeToggle";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  LineChart, 
  Settings, 
  LogOut,
  WalletCards,
  Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isOwner, isAdmin, isWorker } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login"; // force refresh
      }
    });
  };

  const navItems = [
    { href: "/", label: "لوحة القيادة", icon: LayoutDashboard, show: true },
    { href: "/subscribers", label: "المشتركين", icon: Users, show: true },
    { href: "/invoices", label: "الفواتير والجباية", icon: Receipt, show: true },
    { href: "/financial-history", label: "التاريخ المالي", icon: LineChart, show: isOwner },
    { href: "/expenses", label: "المصروفات", icon: WalletCards, show: isOwner || isAdmin },
    { href: "/generators", label: "المولدات", icon: Factory, show: isOwner },
    { href: "/users", label: "المستخدمين", icon: Settings, show: isOwner },
  ].filter(item => item.show);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-l border-sidebar-border h-full text-sidebar-foreground">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-black text-sidebar-primary tracking-tight">مولدتي</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">{user?.name}</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <Button 
                  variant={active ? "secondary" : "ghost"} 
                  className={cn("w-full justify-start gap-3 mb-1", active ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <ThemeToggle />
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-red-400 hover:text-red-500 hover:bg-red-500/10">
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0 relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-xl font-bold text-primary">مولدتي</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-500">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card flex items-center justify-around p-2 pb-safe z-50">
        {navItems.slice(0, 4).map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn("flex flex-col items-center justify-center p-2 rounded-xl min-w-[4rem]", active ? "text-primary" : "text-muted-foreground")}>
                <item.icon className={cn("h-6 w-6 mb-1", active && "fill-primary/20")} />
                <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
              </div>
            </Link>
          );
        })}
        {navItems.length > 4 && (
           <Link href="/settings-menu">
            <div className={cn("flex flex-col items-center justify-center p-2 rounded-xl min-w-[4rem]", location === "/settings-menu" ? "text-primary" : "text-muted-foreground")}>
              <Settings className={cn("h-6 w-6 mb-1")} />
              <span className="text-[10px] font-medium">المزيد</span>
            </div>
         </Link>
        )}
      </nav>
    </div>
  );
}