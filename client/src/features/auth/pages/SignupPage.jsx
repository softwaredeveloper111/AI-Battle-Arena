import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Brand from '../../../components/Brand'
import PixelCluster from '../../../components/PixelCluster'
import {
  CheckIcon,
  LockIcon,
  MailIcon,
  PillarLogo,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
} from '../../../components/Icons'
import {
  GoogleButton,
  LanguageSelect,
  OrDivider,
  SwitchAuth,
} from '../components/AuthElements'
import arenaHero from '../../../assets/arena-hero.jpg'
import styles from './SignupPage.module.scss'
import SpinnerLoader from '../../../components/SpinnerLoader'
import useAuth from '../hooks/useAuth'
import { signupSchema } from '../schemas/auth.schema'

const PASSWORD_RULES = [
  '8–32 characters',
  '1 uppercase & 1 lowercase letter',
  '1 number & 1 special character (@, $, !, %, *, ?, &)',
  'Letters, numbers and underscores only for username',
]

const SignupPage = () => {
  const { registerHandler, isLoading } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data) => {
    const { username, email, password } = data

    if (username && email && password) {
      const res = await registerHandler(username, email, password)
      if (res) {
        reset()
        navigate('/')
      }
    }
  }

  const onError = (formErrors) => {
    const firstError = Object.values(formErrors)[0]
    if (firstError?.message) {
      toast.error(firstError.message)
    }
  }

  if (isLoading) {
    return <SpinnerLoader />
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

            <form className={styles.form} onSubmit={handleSubmit(onSubmit, onError)} noValidate>
              {/* Username field */}
              <div className={styles.field}>
                <label htmlFor="signup-username" className={styles.label}>
                  Username
                </label>
                <div className={styles.inputWrap}>
                  <UserIcon size={17} className={styles.leadIcon} />
                  <input
                    {...register('username')}
                    id="signup-username"
                    name="username"
                    type="text"
                    placeholder="Choose a username"
                    className={styles.input}
                    autoComplete="username"
                  />
                </div>
                {errors.username && <span className={styles.errors}>{errors.username.message}</span>}
              </div>

              {/* Email field */}
              <div className={styles.field}>
                <label htmlFor="signup-email" className={styles.label}>
                  Email
                </label>
                <div className={styles.inputWrap}>
                  <MailIcon size={17} className={styles.leadIcon} />
                  <input
                    {...register('email')}
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className={styles.input}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className={styles.errors}>{errors.email.message}</span>}
              </div>

              {/* Password field with eye toggle */}
              <div className={styles.field}>
                <label htmlFor="signup-password" className={styles.label}>
                  Password
                </label>
                <div className={styles.inputWrap}>
                  <LockIcon size={17} className={styles.leadIcon} />
                  <input
                    {...register('password')}
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    className={styles.input}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eye}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeIcon size={17} /> : <EyeOffIcon size={17} />}
                  </button>
                </div>
                {errors.password && <span className={styles.errors}>{errors.password.message}</span>}
              </div>

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
                <button type="submit" id="signup-submit-btn" className={styles.submit}>
                  <span>Sign up</span>
                  <ArrowRightIcon size={18} className={styles.submitArrow} />
                </button>
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
