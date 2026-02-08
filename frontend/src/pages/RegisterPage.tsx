import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { getAuthErrorMessage, signUpWithEmail, type AuthSnapshot } from '@/auth'

type RegisterPageProps = {
  auth: AuthSnapshot
}

export default function RegisterPage({ auth }: RegisterPageProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!auth.initializing && auth.user) {
      navigate('/', { replace: true })
    }
  }, [auth.initializing, auth.user, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await signUpWithEmail(email.trim(), password)
      navigate('/', { replace: true })
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!auth.initializing && auth.user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl w-full max-w-md shadow-xl border border-white/20">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Register
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="register-email" className="text-white block mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting || auth.initializing}
              required
              className="w-full p-2 rounded bg-white/20 text-white outline-none disabled:opacity-60"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="text-white block mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting || auth.initializing}
              required
              minLength={6}
              className="w-full p-2 rounded bg-white/20 text-white outline-none disabled:opacity-60"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="text-white block mb-1">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting || auth.initializing}
              required
              minLength={6}
              className="w-full p-2 rounded bg-white/20 text-white outline-none disabled:opacity-60"
              placeholder="Re-enter your password"
            />
          </div>

          {error ? (
            <p className="rounded border border-red-300/40 bg-red-500/15 px-3 py-2 text-sm text-red-100" role="alert">
              {error}
            </p>
          ) : null}

          {auth.initializing ? (
            <p className="text-sm text-blue-200">Checking your saved session...</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || auth.initializing}
            className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold transition disabled:cursor-not-allowed disabled:bg-blue-800"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-blue-300 mt-4">
            Already have an account?
            <Link to="/login" className="underline ml-1">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
