import styles from './PixelCluster.module.scss'

/*
 * Decorative gold "pixel" cluster seen in the corners of the mockups.
 * Each string row: '#' = solid gold, '+' = mid, '.' = faint, ' ' = empty.
 */
const PATTERNS = {
  corner: ['  .+#', ' .+##', '..+.#', '. .+ '],
  stairs: ['   ##', '  #+ ', ' .#  ', '#+   ', '+.   '],
  fade: ['#+. .', '+#+. ', '.+#+.', ' .+#+'],
}

const PixelCluster = ({ variant = 'corner', cell = 9, className = '' }) => {
  const rows = PATTERNS[variant]
  return (
    <div
      className={`${styles.cluster} ${className}`}
      style={{ '--cell': `${cell}px`, gridTemplateColumns: `repeat(${rows[0].length}, var(--cell))` }}
      aria-hidden
    >
      {rows.flatMap((row, r) =>
        row.split('').map((c, i) => (
          <span
            key={`${r}-${i}`}
            className={c === '#' ? styles.solid : c === '+' ? styles.mid : c === '.' ? styles.faint : ''}
          />
        )),
      )}
    </div>
  )
}

export default PixelCluster
