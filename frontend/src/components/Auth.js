import { useState } from 'react'
import supabase from '../lib/supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  return (
    <div className="auth-screen">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Fimplify</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" className="primary">
          {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>
        <button type="button" className="ghost" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Ya tengo cuenta' : 'Crear cuenta'}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  )
}
