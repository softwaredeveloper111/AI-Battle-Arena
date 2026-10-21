import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
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
import styles from './SignupPage.module.scss';
import spinnerLoader from "../../../components/SpinnerLoader";
import useAuth from "../hooks/useAuth"



/**
 * Register validation schema aligned with backend:
 * server/src/validations/auth.validator.ts & server/src/models/user.model.ts
 */
const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username must be at most 20 characters long')
    .regex(/^[a-z0-9_]{3,20}$/, 'Please provide a valid username (letters, numbers, underscore)'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(32, 'Password must be at most 32 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,32}$/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
})

const PASSWORD_RULES = [
  '6–32 characters',
  '1 uppercase & 1 lowercase letter',
  '1 number & 1 special character (@, $, !, %, *, ?, &)',
  'Letters, numbers and underscores only for username',
]

const SignupPage = () => {
 
  const {registerHandler,isLoading} = useAuth()

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const username = e.target.querySelector('#signup-username')?.value.trim() ?? ''
    const email = e.target.querySelector('#signup-email')?.value.trim() ?? ''
    const password = e.target.querySelector('#signup-password')?.value ?? ''

    const validation = signupSchema.safeParse({ username, email, password })

    if (!validation.success) {
      const firstIssue = validation.error.issues?.[0]
      const errorMessage = firstIssue?.message || 'Invalid input'
      toast.error(errorMessage)
      return
    }

    // console.log({
    //   username: validation.data.username,
    //   email: validation.data.email,
    //   password: validation.data.password,
    // })
    
     const res = await registerHandler(username, email, password);
      if (res) {
        navigate('/')
      }

  }

  if(isLoading) return <spinnerLoader/>

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

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
