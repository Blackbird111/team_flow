import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  authorImage?: string;
  image?: string;
  tags?: string[];
  readingTime: number;
  content: string;
}

function calcReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function getAllPosts(): Promise<Omit<Post, "content">[]> {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx?$/, "");
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
    const { data, content } = matter(raw);

    return {
      slug,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      author: (data.author as string) ?? "Team",
      authorImage: data.authorImage as string | undefined,
      image: data.image as string | undefined,
      tags: (data.tags as string[]) ?? [],
      readingTime: calcReadingTime(content),
    };
  });

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const extensions = ["mdx", "md"];

  for (const ext of extensions) {
    const filePath = path.join(BLOG_DIR, `${slug}.${ext}`);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
      slug,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      author: (data.author as string) ?? "Team",
      authorImage: data.authorImage as string | undefined,
      image: data.image as string | undefined,
      tags: (data.tags as string[]) ?? [],
      readingTime: calcReadingTime(content),
      content,
    };
  }

  return null;
}