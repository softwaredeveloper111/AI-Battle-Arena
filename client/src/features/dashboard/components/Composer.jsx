import { ChevronDownIcon, PaperclipIcon, ScanIcon, SendIcon } from '../../../components/Icons'
import styles from './Composer.module.scss'

/**
 * Bottom prompt composer (static UI).
 * modeIcon / modeLabel render the mode chip; `withCaret` shows a chevron.
 */
const Composer = ({ placeholder, modeIcon: ModeIcon, modeLabel, withCaret = false, children }) => {
  return (
    <div className={styles.wrap}>
      <div className={styles.composer}>
        <textarea id="composer-input" className={styles.input} placeholder={placeholder} rows={1} />

        <div className={styles.actions}>
          <button type="button" id="composer-attach-btn" className={styles.squareBtn} aria-label="Attach file">
            <PaperclipIcon size={18} />
          </button>

          <button type="button" id="composer-mode-chip" className={styles.modeChip}>
            {ModeIcon && <ModeIcon size={18} />}
            <span>{modeLabel}</span>
            {withCaret && <ChevronDownIcon size={15} />}
          </button>

          <div className={styles.spacer} />

          <button type="button" id="composer-scan-btn" className={styles.squareBtn} aria-label="Scan">
            <ScanIcon size={18} />
          </button>
          <button type="button" id="composer-send-btn" className={styles.sendBtn} aria-label="Send">
            <SendIcon size={18} />
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}

export default Composer
