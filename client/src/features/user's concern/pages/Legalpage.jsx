import { Link } from "react-router-dom";
import styles from "./legal.module.scss";

export default function LegalPage({ title, updated, sections }) {
  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <Link to="/" className={styles.back}>← Back to app</Link>
        <h1>{title}</h1>
        <p className={styles.meta}>Last updated: {updated}</p>
        {sections.map((s, sIdx) => (
          <section key={s.h || sIdx}>
            <h2>{s.h}</h2>
            {s.p?.map((t, pIdx) => (
              <p key={typeof t === "string" ? t : pIdx}>{t}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((item, lIdx) => (
                  <li key={typeof item === "string" ? item : lIdx}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </main>
  );
}