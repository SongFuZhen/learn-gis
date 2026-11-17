import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { SKILL_REGISTRY } from "@/content/registry";
import { chapterNo } from "@/lib/content";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ skill: string }> },
) {
  const { skill } = await params;
  const course = SKILL_REGISTRY.find((item) => item.id === skill);
  if (!course) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const modules = course.modules.map((module) => ({
    slug: module.slug,
    file: module.file,
    title: module.title,
    chapterNo: chapterNo(module.slug),
    ready: existsSync(
      path.join(process.cwd(), "public", "audio", module.file, "manifest.json"),
    ),
  }));

  return NextResponse.json({ modules });
}
