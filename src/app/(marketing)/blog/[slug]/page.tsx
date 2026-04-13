import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { generateSEO, siteConfig } from "@/lib/seo";
import { MDXContent } from "@/components/blog/mdx-content";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return generateSEO({
    title: post.title,
    description: post.description,
    image: post.image,
    path: `/blog/${slug}`,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    url: `${siteConfig.url}/blog/${slug}`,
    ...(post.image && { image: post.image }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Button variant="ghost" size="sm" className="mb-8 -ml-2 gap-1.5 text-muted-foreground" asChild>
          <Link href="/blog">
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>
        </Button>

        <header className="mb-10">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">{post.title}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">{post.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground pb-8 border-b border-border/60">
            <div className="flex items-center gap-2">
              {post.authorImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.authorImage} alt={post.author} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-semibold text-violet-600 dark:text-violet-400">
                  {post.author[0]}
                </div>
              )}
              <span className="font-medium text-foreground">{post.author}</span>
            </div>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readingTime} min read
            </span>
          </div>
        </header>

        <MDXContent source={post.content} />
      </div>
    </>
  );
}