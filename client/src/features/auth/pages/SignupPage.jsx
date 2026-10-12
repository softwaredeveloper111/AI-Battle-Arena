import { Link, useNavigate } from 'react-router-dom'
import Brand from '../../../components/Brand'
import PixelCluster from '../../../components/PixelCluster'
import { CheckIcon, LockIcon, MailIcon, PillarLogo, UserIcon } from '../../../components/Icons'
import {
  AuthInput,
  GoogleButton,
  LanguageSelect,
  OrDivider,
  SubmitButton,
  SwitchAuth,
} from '../components/AuthElements'
import arenaHero from '../../../assets/arena-hero.jpg'
import styles from './SignupPage.module.scss'

const PASSWORD_RULES = [
  '8 characters',
  '1 special character (e.g. !, @, #, $)',
  '1 number',
  'No leading or trailing whitespace',
]

const SignupPage = () => {
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/')
  }
  return (
    <main className={styles.page}>
      <span className={styles.dotsLeft} aria-hidden />
      <span className={styles.dotsRight} aria-hidden />
      <PixelCluster variant="stairs" cell={12} className={styles.pixels} />

      {/* ---------- Left : Brand + Headline + Arena Hero ---------- */}
      <section className={styles.left}>
        <header className={styles.leftHeader}>
          <Brand size="sm" />
        </header>

        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            Build, battle and
            <br />
            explore with <span>AI</span>.
          </h1>
          <p className={styles.lead}>
            Your all-in-one arena for AI agents,
            <br />
            research and more.
          </p>
        </div>

        <div className={styles.heroArt}>
          <img src={arenaHero} alt="Glowing golden AI arena" />
        </div>
      </section>

      {/* ---------- Right : Card touching top & bottom ---------- */}
      <section className={styles.right}>
        <div className={styles.card}>
          <LanguageSelect className={styles.langSelect} />

          <div className={styles.cardInner}>
            <div className={styles.cardHead}>
              <PillarLogo size={36} className={styles.cardLogo} />
              <h2>Create your account</h2>
              <p>
                Join <strong>AI BATTLE ARENA</strong> and start exploring.
              </p>
            </div>

            <div className={styles.googleWrap}>
              <GoogleButton id="signup-google-btn" />
            </div>

            <OrDivider />

            <form className={styles.form} onSubmit={handleSubmit}>
              <AuthInput id="signup-username" label="Username" placeholder="Choose a username" icon={UserIcon} />
              <AuthInput id="signup-email" label="Email" type="email" placeholder="you@example.com" icon={MailIcon} />
              <AuthInput
                id="signup-password"
                label="Password"
                type="password"
                placeholder="Create a password"
                icon={LockIcon}
                trailingEye
              />

              <div className={styles.rules}>
                <p>Use a password that contains at least:</p>
                <ul>
                  {PASSWORD_RULES.map((rule) => (
                    <li key={rule}>
                      <CheckIcon size={13} />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.submitWrap}>
                <SubmitButton id="signup-submit-btn">Sign up</SubmitButton>
              </div>
            </form>

            <div className={styles.switch}>
              <SwitchAuth text="Already have an account?" linkText="Log in" to="/login" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default SignupPage
