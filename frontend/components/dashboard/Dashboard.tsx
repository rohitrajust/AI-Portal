"use client";

import { dashboardProjects } from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";
import { useAuth } from "@/lib/auth";

export function Dashboard() {
  const { canAccessProject } = useAuth();
  // const visibleProjects = dashboardProjects.filter((project) =>
  //   user?.roles.includes("admin") || canAccessProject(project.id)
  // );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,151,172,0.12),_transparent_35%),linear-gradient(135deg,_#ffffff,_#f8fafc)] px-6 py-16 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0097ac]">
            AI Portal
          </p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl text-[#020511]">
            Central hub for your Flask and FastAPI applications
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#4b5563]">
            Every app built by the team is listed below. You can open the ones
            assigned to your account.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {dashboardProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              allowed={canAccessProject(project.id)}
            />
          ))}
        </section>
      </div>
    </main>
  );
}