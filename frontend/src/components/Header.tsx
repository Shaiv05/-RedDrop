import { Heart, Menu, X, LogOut, LayoutDashboard, ChevronDown, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const isHospitalUser = isAuthenticated && user?.role === "hospital";
  const userInitial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  const navLinks = [
    { label: "Home", to: "/#home", requiresAuth: false, role: "all" as const },
    { label: "Emergency", to: "/#emergency", requiresAuth: false, role: "all" as const },
    {
      label: isHospitalUser ? "Donors" : "Hospitals",
      to: isHospitalUser ? "/#donors" : "/#hospitals",
      requiresAuth: true,
      role: "all" as const,
    },
    { label: "About Us", to: "/about", requiresAuth: false, role: "all" as const },
    { label: "Contact Us", to: "/contact", requiresAuth: false, role: "all" as const },
  ];

  const visibleNavLinks = navLinks.filter((link) => {
    if (link.requiresAuth && !isAuthenticated) return false;
    if (link.role === "all") return true;
    return user?.role === link.role;
  });

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <a href="/#home" className="flex items-center gap-2 group">
          <div className="relative">
            <Heart className="h-8 w-8 text-primary animate-heartbeat" fill="currentColor" />
          </div>
          <span className="text-xl font-bold text-gradient">RedDrop</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {visibleNavLinks.map((link) => (
            <a
              key={link.label}
              href={link.to}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isLoading ? null : isAuthenticated ? (
            <>
              {isHospitalUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-10 rounded-full border bg-card px-2 pr-3 flex items-center gap-2 hover:border-primary/40 transition-colors">
                      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                        {userInitial}
                      </span>
                      <span className="text-sm font-medium max-w-[140px] truncate">{user?.name || user?.email}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/hospital-dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Hospital Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-10 rounded-full border bg-card px-2 pr-3 flex items-center gap-2 hover:border-primary/40 transition-colors">
                      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                        {userInitial}
                      </span>
                      <span className="text-sm font-medium max-w-[140px] truncate">{user?.name || user?.email}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        User Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">Login</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/auth?mode=signin&role=user">Login as User</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth?mode=signin&role=hospital">Login as Hospital</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="hero" size="sm">Register</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/auth?mode=signup&role=user">Register as User</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth?mode=signup&role=hospital">Register as Hospital</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={cn(
          "md:hidden absolute top-16 left-0 right-0 bg-background border-b transition-all duration-300 overflow-hidden",
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="container py-4 flex flex-col gap-4">
          {visibleNavLinks.map((link) => (
            <a
              key={link.label}
              href={link.to}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-4 border-t">
            {isLoading ? null : isAuthenticated ? (
              <>
                {isHospitalUser ? (
                  <>
                    <div className="flex items-center gap-2 px-2">
                      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                        {userInitial}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {user?.name || user?.email}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/hospital-dashboard" onClick={() => setIsMenuOpen(false)}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Hospital Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/?tab=hospital#register" onClick={() => setIsMenuOpen(false)}>
                        <Building2 className="h-4 w-4 mr-2" />
                        Emergency Registration
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-2">
                      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                        {userInitial}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {user?.name || user?.email}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        User Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">Login</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link to="/auth?mode=signin&role=user" onClick={() => setIsMenuOpen(false)}>
                        Login as User
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/auth?mode=signin&role=hospital" onClick={() => setIsMenuOpen(false)}>
                        Login as Hospital
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="hero" size="sm" className="w-full">Register</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link to="/auth?mode=signup&role=user" onClick={() => setIsMenuOpen(false)}>
                        Register as User
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/auth?mode=signup&role=hospital" onClick={() => setIsMenuOpen(false)}>
                        Register as Hospital
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
