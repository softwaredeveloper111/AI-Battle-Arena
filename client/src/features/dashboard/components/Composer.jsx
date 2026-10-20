import { useEffect, useRef, useState } from 'react'
import { ArrowUpIcon } from '../../../components/Icons'
import styles from './Composer.module.scss'

/**
 * ChatGPT-style prompt composer.
 * - Single-line pill initially with input and inactive/empty send button.
 * - Automatically expands to a card layout with scrollbar on multiline / long text.
 * - Send button activates (glowing gold theme) once user types any letter.
 */
const Composer = ({ placeholder = 'Ask a follow-up...', onSend }) => {
  const [value, setValue] = useState('')
  const [isMultiline, setIsMultiline] = useState(false)
  const textareaRef = useRef(null)

  const canSend = value.trim().length > 0

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = 'auto'
    const scrollHeight = el.scrollHeight
    const singleLine = 24
    const maxHeight = 200

    const multiline = scrollHeight > 36 || value.includes('\n')
    setIsMultiline(multiline)

    if (scrollHeight > maxHeight) {
      el.style.height = `${maxHeight}px`
      el.style.overflowY = 'auto'
    } else {
      el.style.height = `${Math.max(scrollHeight, singleLine)}px`
      el.style.overflowY = 'hidden'
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) {
        handleSubmit()
      }
    }
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!canSend) return
    onSend?.(value.trim())
    setValue('')
  }

  return (
    <div className={styles.wrap}>
      <form
        className={`${styles.composer} ${isMultiline ? styles.multiline : ''}`}
        onSubmit={handleSubmit}
      >
        <div className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            id="composer-input"
            className={styles.input}
            placeholder={placeholder}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            id="composer-send-btn"
            className={`${styles.sendBtn} ${canSend ? styles.active : ''}`}
            disabled={!canSend}
            aria-label="Send message"
            title={canSend ? 'Send message' : 'Type a message to send'}
          >
            <ArrowUpIcon size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}

export default Composer



