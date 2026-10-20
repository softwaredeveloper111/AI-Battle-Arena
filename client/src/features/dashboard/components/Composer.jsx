import { SendIcon } from '../../../components/Icons'
import styles from './Composer.module.scss'

/**
 * Bottom prompt composer (static UI).
 */
const Composer = ({ placeholder, children }) => {
  return (
    <div className={styles.wrap}>
      <div className={styles.composer}>
        <textarea id="composer-input" className={styles.input} placeholder={placeholder} rows={1} />

        <div className={styles.actions}>
          <div className={styles.spacer} />

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

