import { PillarLogo } from './Icons'
import styles from './Brand.module.scss'

/**
 * AI BATTLE ARENA wordmark. `size` = 'sm' | 'md' | 'lg'
 */
const Brand = ({ size = 'md', stacked = false, className = '' }) => {
  const iconSize = { sm: 28, md: 34, lg: 72 }[size]

  return (
    <div className={`${styles.brand} ${styles[size]} ${stacked ? styles.stacked : ''} ${className}`}>
      <PillarLogo size={iconSize} className={styles.icon} />
      <span className={styles.word}>
        AI BATTLE <span className={styles.accent}>ARENA</span>
      </span>
    </div>
  )
}

export default Brand
