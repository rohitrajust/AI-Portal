"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({
  children,
  role,
  projectId,
}: {
  children: ReactNode;
  role?: string;
  projectId?: string;
}) {
  const router = useRouter();
  const { isAuthenticated, hasRole, canAccessProject, isReady } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isReady) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (role && !hasRole(role)) {
      router.replace("/");
      return;
    }

    if (projectId && !canAccessProject(projectId)) {
      router.replace("/");
    }
  }, [mounted, isReady, isAuthenticated, hasRole, canAccessProject, role, projectId, router]);

  if (!mounted || !isReady) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (role && !hasRole(role)) {
    return null;
  }

  if (projectId && !canAccessProject(projectId)) {
    return null;
  }

  return <>{children}</>;
}
