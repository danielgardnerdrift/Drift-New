"use client";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarLogo() {
  const sidebar = useSidebar();
  if (sidebar && sidebar.state === "collapsed") {
    return (
      <img
        src="https://framerusercontent.com/images/9Rn7ffrmMVfnT3aVCmGKZySRL0.png"
        alt="Drift"
        className="h-8 fixed top-4 left-4 z-50"
      />
    );
  }
  return null;
} 