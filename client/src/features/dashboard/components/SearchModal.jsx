import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChatIcon, SearchIcon } from '../../../components/Icons'
import { groupChatSessionsByDate } from '../data/conversations'
import styles from './SearchModal.module.scss'

/**
 * Centered chat-history search popup.
 * Fixed size; the results list scrolls when there are many chats.
 */
const SearchModal = ({ open, onClose, onSelect, activeId, sessions = [] }) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? sessions.filter((c) => (c?.title || '').toLowerCase().includes(q))
      : sessions
    return groupChatSessionsByDate(list)
  }, [query, sessions])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  useEffect(() => {
    if (!open) return
    setQuery('')
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onInputKey = (e) => {
    if (e.key === 'Enter' && total > 0) {
      const first = groups[0].items[0]
      onSelect(first._id || first.id)
    }
  }

  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Search chats"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.searchBar}>
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            id="chat-search-input"
            className={styles.input}
            type="text"
            placeholder="Search chats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            autoComplete="off"
          />
          <button type="button" className={styles.esc} onClick={onClose} aria-label="Close search">
            Esc
          </button>
        </div>

        <div className={styles.results}>
          {total === 0 ? (
            <p className={styles.empty}>
              {sessions.length === 0 ? 'No previous chats' : `No chats found for “${query}”`}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className={styles.group}>
                <h4 className={styles.groupLabel}>{g.label}</h4>
                {g.items.map((c) => {
                  const id = c._id || c.id
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`${styles.result} ${id === activeId ? styles.activeResult : ''}`}
                      onClick={() => onSelect(id)}
                    >
                      <ChatIcon size={17} />
                      <span>{c.title}</span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default SearchModal
