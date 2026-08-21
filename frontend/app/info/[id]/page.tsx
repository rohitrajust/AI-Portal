import Link from "next/link";
import { notFound } from "next/navigation";
import { dashboardProjects } from "@/lib/projects";
import { INFO_PAGES } from "@/lib/infoPages";

export default async function InfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = dashboardProjects.find((p) => p.id === id);
  const infoUrl = INFO_PAGES[id];

  if (!project || !infoUrl) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-teal-200 bg-white px-6 py-3 shadow-sm">
        <Link
          href="/"
          className="rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-sm font-semibold text-teal-900">{project.name}</h1>
        <Link
          href={project.route}
          className="rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Open Application →
        </Link>
      </div>
      <iframe
        src={infoUrl}
        title={`${project.name} info`}
        className="w-full flex-1 border-0"
      />
    </div>
  );
}