"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { INFO_PAGES } from "@/lib/infoPages";

interface ProjectCardProps {
  project: Project;
  allowed: boolean;
}

export function ProjectCard({ project, allowed }: ProjectCardProps) {
  const router = useRouter();

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {allowed ? project.status : "Restricted"}
          </p>
          <h3 className="mt-3 text-xl font-semibold text-teal-900">{project.name}</h3>
          <p className="mt-2 text-sm leading-6 text-teal-700">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
  {/* <span
    className={`rounded-full border px-3 py-1 text-xs font-medium ${
      allowed
        ? "border-teal-600 bg-teal-600 text-white"
        : "border-slate-300 bg-slate-100 text-slate-500"
    }`}
  >
    {allowed ? "Open" : "🔒 Locked"}
  </span> */}

  {INFO_PAGES[project.id] ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/info/${project.id}`);
      }}
      aria-label={`About ${project.name}`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-teal-300 bg-white text-teal-700 transition duration-200 hover:border-teal-500 hover:bg-teal-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <line x1="12" y1="10" x2="12" y2="16" />
        <line x1="12" y1="7" x2="12.01" y2="7" />
      </svg>
    </button>
  ) : null}
</div>
      </div>
    </>
  );

  if (!allowed) {
    return (
      <div className="cursor-not-allowed rounded-2xl border border-teal-300 bg-teal-50 p-6 opacity-60 shadow-lg">
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={project.route}
      className="group rounded-2xl border border-teal-300 bg-teal-50 p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-teal-500 hover:bg-white hover:shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
    >
      {cardContent}
    </Link>
  );
}