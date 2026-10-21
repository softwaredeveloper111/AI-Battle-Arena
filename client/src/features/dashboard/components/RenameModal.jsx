import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './RenameModal.module.scss'

const MAX_CHARACTERS = 60
const MIN_WORDS = 2
const MAX_WORDS = 4

const validateTitle = (text) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return 'Title cannot be empty'
  }
  if (trimmed.length > MAX_CHARACTERS) {
    return `Title must be at most ${MAX_CHARACTERS} characters`
  }
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < MIN_WORDS) {
    return `Title must be at least ${MIN_WORDS} words`
  }
  if (words.length > MAX_WORDS) {
    return `Title must be at most ${MAX_WORDS} words`
  }
  return ''
}

const RenameModal = ({ open, title, onClose, onSave }) => {
  const [val, setVal] = useState(title || '')
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      const initial = title || ''
      setVal(initial)
      setError(validateTitle(initial))
      setTouched(false)
      setSubmitting(false)
      const timer = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, title])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  if (!open) return null

  const handleChange = (e) => {
    const nextVal = e.target.value
    setVal(nextVal)
    setTouched(true)
    setError(validateTitle(nextVal))
  }

  const handleBlur = () => {
    setTouched(true)
    setError(validateTitle(val))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    const err = validateTitle(val)
    if (err) {
      setError(err)
      return
    }
    setSubmitting(true)
    try {
      await onSave?.(val.trim().replace(/\s+/g, ' '))
    } finally {
      setSubmitting(false)
    }
  }

  const hasError = touched && !!error

  return createPortal(
    <div className={styles.overlay} onMouseDown={submitting ? undefined : onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Rename Chat"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className={styles.title}>Rename Chat</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={`${styles.input} ${hasError ? styles.inputError : ''}`}
            value={val}
            maxLength={MAX_CHARACTERS}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={submitting}
            placeholder="Enter chat title (2-4 words)..."
          />
          {hasError && <p className={styles.errorMessage}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={hasError || submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default RenameModal
