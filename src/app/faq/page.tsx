import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import FaqIndex from "@/components/faq/faq-index";
import { faqItems } from "@/lib/faq";

export const metadata = {
  title: "FAQ — NamesRanker",
  description:
    "Answers about claiming your name, ranking on Google, Premium, custom domains, name monitoring, and your data.",
};

export default function FaqPage() {
  return (
    <main>
      <NavBar />
      <FaqIndex items={faqItems} />
      <Footer />
    </main>
  );
}
