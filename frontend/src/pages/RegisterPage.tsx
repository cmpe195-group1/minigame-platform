import { Link } from 'react-router'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl w-full max-w-md shadow-xl border border-white/20">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Register
        </h1>

        <form className="space-y-4">
          <div>
            <label className="text-white block mb-1">Email</label>
            <input
              type="email"
              className="w-full p-2 rounded bg-white/20 text-white outline-none"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="text-white block mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded bg-white/20 text-white outline-none"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="text-white block mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full p-2 rounded bg-white/20 text-white outline-none"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold transition"
          >
            Create Account
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
