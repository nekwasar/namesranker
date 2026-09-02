import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import BlogIndex from "@/components/blog/blog-index";
import { blogPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog — NamesRanker",
  description:
    "Product news, SEO insights, and guides from NamesRanker — everything about getting your name ranked on Google.",
};

export default function BlogPage() {
  return (
    <main>
      <NavBar />
      <BlogIndex posts={blogPosts} />
      <Footer />
    </main>
  );
}
