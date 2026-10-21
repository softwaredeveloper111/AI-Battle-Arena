import { useState } from 'react'
import { CopyIcon, CheckIcon } from '../../../components/Icons'
import MarkdownRenderer from './MarkdownRenderer'
import styles from './ResponseCard.module.scss'

const ResponseCard = ({ label, content, paragraphs, isStreaming = false }) => {
  const [copied, setCopied] = useState(false)

  const text = typeof content === 'string'
    ? content
    : Array.isArray(paragraphs)
      ? paragraphs.join('\n\n')
      : ''

  const handleCopy = () => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <span className={styles.dot} />
        <h3>{label}</h3>
        <button
          type="button"
          className={styles.copy}
          aria-label={`Copy ${label}`}
          onClick={handleCopy}
          title={copied ? 'Copied!' : `Copy ${label}`}
        >
          {copied ? <CheckIcon size={17} /> : <CopyIcon size={17} />}
        </button>
      </header>
      <div className={styles.body}>
        {text ? (
          <MarkdownRenderer content={text} />
        ) : isStreaming ? (
          <p className={styles.thinking}>Thinking...</p>
        ) : null}
      </div>
    </article>
  )
}

export default ResponseCard
