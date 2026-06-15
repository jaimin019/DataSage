import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-lg group-hover:bg-primary/50 transition-colors" />
            <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            DataSage
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!user ? (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              Sign in
            </Button>
          ) : (
            <>
              <Link
                to="/history"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block px-3"
                activeProps={{ className: "text-foreground" }}
              >
                My Analyses
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon",
                    className: "rounded-full",
                  })}
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-xs font-semibold text-primary-foreground">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/history" })}>
                    My Analyses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
                    New Analysis
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
