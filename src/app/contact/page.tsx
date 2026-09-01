import Link from "next/link";
import NavBar from "@/components/site/nav";
import Footer from "@/components/site/footer";
import ContactForm from "@/components/contact/contact-form";
import { config } from "@/lib/config";
import styles from "@/components/contact/contact.module.css";

export const metadata = {
  title: "Contact — NamesRanker",
  description:
    "Talk to the NamesRanker team about claiming your name, Premium, press, or partnerships. We usually reply within one business day.",
};

const channels = [
  {
    label: "General",
    email: config.contact.email,
    note: "Questions about claiming your name, ranking, or anything else.",
  },
  {
    label: "Support",
    email: "support@namesranker.com",
    note: "Signed in? Settings is the fastest way to get help with your account.",
  },
  {
    label: "Press",
    email: "press@namesranker.com",
    note: "Interviews, stories, and media inquiries about NamesRanker.",
  },
];

export default function ContactPage() {
  return (
    <main>
      <NavBar />
      <div className={styles.page}>
        <h1 className={styles.title}>Contact</h1>
        <p className={styles.subtitle}>
          Talk to a human at NamesRanker. We usually reply within one business day.
        </p>
        <hr className={styles.rule} />

        <div className={styles.grid}>
          <aside className={styles.info}>
            <h2 className={styles.infoHeading}>Ways to reach us</h2>
            <ul className={styles.channels}>
              {channels.map((c) => (
                <li key={c.label} className={styles.channel}>
                  <p className={styles.channelLabel}>{c.label}</p>
                  <a href={`mailto:${c.email}`} className={styles.channelEmail}>
                    {c.email}
                  </a>
                  <p className={styles.channelNote}>{c.note}</p>
                </li>
              ))}
            </ul>
            <div className={styles.note}>
              <p className={styles.noteTitle}>Report a problem</p>
              <p className={styles.noteBody}>
                Having trouble with your page? Sign in and open{" "}
                <Link href="/settings" className={styles.inlineLink}>
                  Settings
                </Link>{" "}
                for account-specific help, or check the{" "}
                <Link href="/faq" className={styles.inlineLink}>
                  FAQ
                </Link>{" "}
                first.
              </p>
            </div>
          </aside>

          <div className={styles.formWrap}>
            <ContactForm />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
