import type { Metadata } from "next";

const siteConfig = {
  name: "SaaSKit",
  description:
    "A production-ready Next.js SaaS starter template with auth, payments, and AI.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com",
  ogImage: "/og.png",
  twitterHandle: "@yourtwitterhandle",
};

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  path?: string;
}

export function generateSEO({
  title,
  description,
  image,
  noIndex = false,
  path = "",
}: SEOProps = {}): Metadata {
  const resolvedTitle = title
    ? `${title} | ${siteConfig.name}`
    : `${siteConfig.name} — Build Your SaaS Faster`;
  const resolvedDescription = description ?? siteConfig.description;
  const resolvedImage = image ?? siteConfig.ogImage;
  const resolvedUrl = `${siteConfig.url}${path}`;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: resolvedUrl,
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: resolvedUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: resolvedImage,
          width: 1200,
          height: 630,
          alt: resolvedTitle,
        },
      ],
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [resolvedImage],
      creator: siteConfig.twitterHandle,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export { siteConfig };