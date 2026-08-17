import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section>
        <h1>Own the #1 result for your name.</h1>
        <p>
          NamesRanker builds you a searchable, SEO-engineered page so that when anyone Googles your
          name, your page is the top result.
        </p>
        <Link href="/onboarding">Claim your name</Link>
      </section>
    </main>
  );
}
