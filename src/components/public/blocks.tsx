import type { PublicBlockPayload } from "@/lib/public-page";
import styles from "./blocks.module.css";

function Photo({ payload }: { payload: PublicBlockPayload }) {
  if (!payload.url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={payload.url} alt="" className={styles.photo} />;
}

function Bio({ payload }: { payload: PublicBlockPayload }) {
  if (!payload.text) return null;
  return <p className={styles.bio}>{payload.text}</p>;
}

function Experience({ payload }: { payload: PublicBlockPayload }) {
  if (!payload.role) return null;
  return (
    <article className={styles.experience}>
      <h4>{payload.role}</h4>
      <p className={styles.muted}>
        {payload.company}
        {payload.location ? ` · ${payload.location}` : ""}
        {payload.start ? ` · ${payload.start}${payload.end ? `–${payload.end}` : ""}` : ""}
      </p>
      {payload.summary ? <p>{payload.summary}</p> : null}
    </article>
  );
}

function Project({ payload }: { payload: PublicBlockPayload }) {
  if (!payload.title) return null;
  return (
    <article className={styles.project}>
      <h4>{payload.title}</h4>
      {payload.description ? <p>{payload.description}</p> : null}
      {payload.url ? (
        <a href={payload.url} target="_blank" rel="noopener noreferrer">
          View project →
        </a>
      ) : null}
    </article>
  );
}

function Social({ payload }: { payload: PublicBlockPayload }) {
  const links = payload.links ?? [];
  if (links.length === 0) return null;
  return (
    <ul className={styles.socials}>
      {links.map((link) => (
        <li key={link.platform}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {link.platform}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Testimonial({ payload }: { payload: PublicBlockPayload }) {
  if (!payload.quote) return null;
  return (
    <figure className={styles.testimonial}>
      <blockquote>“{payload.quote}”</blockquote>
      <figcaption>
        {payload.author}
        {payload.role ? `, ${payload.role}` : ""}
      </figcaption>
    </figure>
  );
}

function Publication({ payload }: { payload: PublicBlockPayload }) {
  if (!payload.title) return null;
  return (
    <article className={styles.publication}>
      <a href={payload.url ?? "#"} target="_blank" rel="noopener noreferrer">
        {payload.title}
      </a>
      {payload.publisher ? <span className={styles.muted}> · {payload.publisher}</span> : null}
    </article>
  );
}

export function ContentBlockRenderer({
  type,
  payload,
}: {
  type: string;
  payload: PublicBlockPayload;
}) {
  switch (type) {
    case "PHOTO":
      return <Photo payload={payload} />;
    case "BIO":
      return <Bio payload={payload} />;
    case "EXPERIENCE":
      return <Experience payload={payload} />;
    case "PROJECT":
      return <Project payload={payload} />;
    case "SOCIAL":
      return <Social payload={payload} />;
    case "TESTIMONIAL":
      return <Testimonial payload={payload} />;
    case "PUBLICATION":
      return <Publication payload={payload} />;
    default:
      return null;
  }
}
