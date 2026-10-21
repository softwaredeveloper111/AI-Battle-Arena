import { ScaleIcon, TrophyIcon } from '../../../components/Icons'
import MarkdownRenderer from './MarkdownRenderer'
import styles from './JudgePanel.module.scss'

/**
 * AI Judge panel. Expects judge data shape from the SRS:
 * solution_1_score, solution_2_score, solution_1_reasoning, solution_2_reasoning
 */
const JudgePanel = ({ judge }) => {
  if (!judge) return null
  const { solution_1_score: s1 = 0, solution_2_score: s2 = 0 } = judge
  const winner = s1 === s2 ? null : s1 > s2 ? 1 : 2
  const verdict = winner ? `Assistant ${winner === 1 ? 'A' : 'B'} is winner` : "It's a tie"

  const solutions = [
    { label: 'Assistant A', score: s1, reasoning: judge.solution_1_reasoning, isWinner: winner === 1 },
    { label: 'Assistant B', score: s2, reasoning: judge.solution_2_reasoning, isWinner: winner === 2 },
  ]

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <ScaleIcon size={20} />
        <h3>AI Judge</h3>
      </header>

      <div className={styles.verdict}>
        <TrophyIcon size={26} />
        <h4>{verdict}</h4>
      </div>

      <div className={styles.grid}>
        {solutions.map(({ label, score, reasoning, isWinner }) => (
          <div key={label} className={`${styles.score} ${isWinner ? styles.winner : ''}`}>
            <div className={styles.scoreHead}>
              <span className={styles.ring} />
              <span className={styles.scoreLabel}>{label} Score</span>
              <span className={styles.scoreValue}>
                <strong>{score}</strong> / 10
              </span>
            </div>
            <h5>Reasoning</h5>
            <div className={styles.reasoningBody}>
              <MarkdownRenderer content={reasoning} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default JudgePanel
