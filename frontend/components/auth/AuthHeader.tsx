"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export function AuthHeader() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  if (!mounted) return null;

  return (
    <header className="border-b border-[#0097ac]/10 bg-white/90 px-6 py-4 shadow-sm backdrop-blur-sm sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-7xl items-center justify-between">

        {/* Logo + Portal Name */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ust-logo.png"
            alt="UST Logo"
            width={42}
            height={42}
            priority
          />

          <div>
            <h1 className="text-xl font-bold tracking-[0.25em] text-[#0097ac]">
              UST AI PORTAL
            </h1>
          </div>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <div className="rounded-full bg-[#ecfeff] px-5 py-2 text-[#006e74] font-medium shadow-sm">
                Hi, {user.name} 👋
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-[#0097ac] px-5 py-2 text-white transition hover:bg-[#007d8a]"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#0097ac] px-5 py-2 text-white transition hover:bg-[#007d8a]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}