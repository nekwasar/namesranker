import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import styles from "./content.module.css";

export const metadata = {
  title: "Blog — NamesRanker",
  description: "Product news, SEO insights, and guides from NamesRanker.",
};

const posts = [
  { title: "Why your name isn't ranking #1 on Google (yet)", tag: "SEO" },
  { title: "The anatomy of a page that ranks for a personal name", tag: "Guides" },
  { title: "Name protection: what to do before a copycat claims you", tag: "Product" },
  { title: "How we build pages that load in under a second", tag: "Engineering" },
];

export default function BlogPage() {
  return (
    <main>
      <NavBar />
      <section className={styles.page}>
        <p className={styles.eyebrow}>Blog</p>
        <h1 className={styles.title}>News, insights, and guides</h1>
        <p className={styles.sub}>
          Everything about owning the #1 result for your name — and the SEO that makes it happen.
        </p>
        <div className={styles.list}>
          {posts.map((post) => (
            <article key={post.title} className={styles.row}>
              <span className={styles.tag}>{post.tag}</span>
              <h2 className={styles.postTitle}>{post.title}</h2>
            </article>
          ))}
        </div>
        <p className={styles.note}>Posts coming soon — this page is part of the Resources hub.</p>
      </section>
      <Footer />
    </main>
  );
}
