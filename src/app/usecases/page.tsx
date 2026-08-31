import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import styles from "../blog/content.module.css";

export const metadata = {
  title: "Use cases — NamesRanker",
  description: "Who NamesRanker is for and how it helps them rank #1 for their name.",
};

const cases = [
  {
    who: "Freelancers & consultants",
    why: "Show up first when a client searches you — before a random directory page.",
  },
  {
    who: "Founders & executives",
    why: "Control the story that recruiters, investors, and press find about you.",
  },
  {
    who: "Creators & artists",
    why: "Make sure your portfolio, not a fan page, is the #1 result for your name.",
  },
  {
    who: "Job seekers",
    why: "Rank above LinkedIn and old profiles so hiring managers see you at your best.",
  },
];

export default function UseCasesPage() {
  return (
    <main>
      <NavBar />
      <section className={styles.page}>
        <p className={styles.eyebrow}>Use cases</p>
        <h1 className={styles.title}>Who it&apos;s for</h1>
        <p className={styles.sub}>
          Anyone who&apos;s ever Googled their own name — and wished the top result were theirs.
        </p>
        <div className={styles.list}>
          {cases.map((c) => (
            <article key={c.who} className={styles.row}>
              <h2 className={styles.postTitle}>{c.who}</h2>
              <p className={styles.sub} style={{ margin: "6px 0 0" }}>
                {c.why}
              </p>
            </article>
          ))}
        </div>
        <p className={styles.note}>Detailed use-case stories coming soon.</p>
      </section>
      <Footer />
    </main>
  );
}
