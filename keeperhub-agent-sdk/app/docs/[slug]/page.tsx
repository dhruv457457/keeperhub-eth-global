import Link from "next/link";
import { notFound } from "next/navigation";
import { type DocSlug, docs } from "@/lib/docs";

const docLinks = [
  ["Python LangChain", "python-langchain"],
  ["TypeScript LangChain", "typescript-langchain"],
  ["ElizaOS", "elizaos"],
  ["SDK", "sdk"],
  ["Live API Notes", "live-api-notes"],
] as const;

export function generateStaticParams() {
  return Object.keys(docs).map((slug) => ({ slug }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = docs[slug as DocSlug];
  if (!doc) notFound();

  return (
    <main className="page doc-layout">
      <aside className="doc-nav">
        {docLinks.map(([label, href]) => (
          <Link href={`/docs/${href}`} key={href}>
            {label}
          </Link>
        ))}
      </aside>
      <article className="doc-content">
        <p className="eyebrow">Framework Docs</p>
        <h1>{doc.title}</h1>
        <p className="lead">{doc.subtitle}</p>
        <pre>{doc.install}</pre>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <ul>
              {section.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </main>
  );
}
