import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { getAuthErrorMessage, signInWithEmail, type AuthSnapshot } from '@/auth'

type LoginPageProps = {
  auth: AuthSnapshot
}

export default function LoginPage({ auth }: LoginPageProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    setIsSubmitting(true)

    try {
      await signInWithEmail(email.trim(), password)
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
          Login
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit} data-testid="login-form">
          <div>
            <label htmlFor="login-email" className="text-white block mb-1">
              Email
            </label>
            <input
              id="login-email"
              data-testid="login-email"
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
            <label htmlFor="login-password" className="text-white block mb-1">
              Password
            </label>
            <input
              id="login-password"
              data-testid="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting || auth.initializing}
              required
              className="w-full p-2 rounded bg-white/20 text-white outline-none disabled:opacity-60"
              placeholder="Enter your password"
            />
          </div>

          {error ? (
            <p className="rounded border border-red-300/40 bg-red-500/15 px-3 py-2 text-sm text-red-100" role="alert" data-testid="login-error">
              {error}
            </p>
          ) : null}

          {auth.initializing ? (
            <p className="text-sm text-blue-200">Checking your saved session...</p>
          ) : null}

          <button
            type="submit"
            data-testid="login-submit"
            disabled={isSubmitting || auth.initializing}
            className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold transition disabled:cursor-not-allowed disabled:bg-blue-800"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-blue-300 mt-4">
            Don't have an account?
            <Link to="/register" className="underline ml-1">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
