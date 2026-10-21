import { CopyIcon } from '../../../components/Icons'
import styles from './ResponseCard.module.scss'

const ResponseCard = ({ label, paragraphs }) => (
  <article className={styles.card}>
    <header className={styles.header}>
      <span className={styles.dot} />
      <h3>{label}</h3>
      <button type="button" className={styles.copy} aria-label={`Copy ${label}`}>
        <CopyIcon size={17} />
      </button>
    </header>
    <div className={styles.body}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  </article>
)

export default ResponseCard
