"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username.trim(), password.trim());
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <h1 className="text-3xl font-semibold text-[#020511]">Sign in to AI Portal</h1>
          <p className="mt-3 text-sm text-[#4b5563]">Use a mock account to access the portal and its apps.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#4b5563]">Username</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 text-[#020511] outline-none focus:border-[#0097ac]"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4b5563]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 text-[#020511] outline-none focus:border-[#0097ac]"
                placeholder="admin123"
              />
            </div>
            {error ? <p className="text-sm text-[#b91c1c]">{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#0097ac] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00aebd] disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
        {/* <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6 text-sm text-[#4b5563] shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="font-semibold">Mock accounts</p>
          <ul className="mt-3 space-y-2">
            <li>admin / admin123</li>
            <li>editor / editor123</li>
            <li>viewer / viewer123</li>
          </ul>
        </section> */}
      </div>
    </main>
  );
}
