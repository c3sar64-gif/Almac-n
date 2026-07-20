import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen w-full flex">
      <main className="flex min-h-screen w-full">
        {/* Left Side: Industrial Image & Slogan */}
        <section className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
          <div
            className="absolute inset-0 z-0 h-full w-full bg-cover bg-center"
            style={{ backgroundImage: "url('/industrial_warehouse.png')" }}
          ></div>
          <div className="absolute inset-0 industrial-overlay z-10"></div>
          <div className="relative z-20 flex flex-col justify-between p-margin-desktop w-full text-white">
            <div className="flex items-center gap-stack-sm">
              <img
                alt="OVOPLUS Logo"
                className="h-16 w-auto object-contain bg-white/90 p-2 rounded-xl shadow-md"
                src="/ovoplus_logo.png"
              />
            </div>
            <div className="max-w-xl">
              <h1 className="font-headline-lg text-headline-lg leading-tight mb-stack-md tracking-tight">
                Inteligencia en cada movimiento.
              </h1>
              <p className="font-body-lg text-body-lg text-on-primary-container opacity-90">
                Gestionando el futuro de la logística global con precisión milimétrica y tecnología de vanguardia.
              </p>
            </div>
            <div className="flex items-center gap-stack-md text-on-primary-container font-label-md text-label-md">
              <div className="flex items-center gap-base">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Sistemas Encriptados</span>
              </div>
              <div className="h-4 w-px bg-white/20"></div>
              <div className="flex items-center gap-base">
                <span className="material-symbols-outlined text-[18px]">hub</span>
                <span>Red Global OVO</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Login Form */}
        <section className="w-full lg:w-2/5 bg-surface flex flex-col justify-center items-center p-margin-mobile md:p-margin-desktop relative">
          <div className="w-full max-w-md">
            {/* Mobile Logo only */}
            <div className="lg:hidden mb-stack-lg text-center">
              <img
                alt="OVOPLUS Logo"
                className="h-14 mx-auto object-contain"
                src="/ovoplus_logo.png"
              />
            </div>
            <div className="mb-stack-lg">
              <h2 className="font-headline-md text-headline-md text-primary mb-base">Iniciar Sesión</h2>
              <p className="font-body-md text-on-surface-variant">Ingrese sus credenciales corporativas para acceder al panel de logística.</p>
            </div>
            <form className="space-y-stack-md" onSubmit={onSubmit}>
              {/* Email Input */}
              <div className="relative floating-label-input">
                <input
                  className="w-full h-14 pt-4 pb-2 px-stack-sm border-b border-outline-variant focus:border-primary bg-transparent font-body-md transition-all duration-200"
                  id="email"
                  name="email"
                  placeholder=" "
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <label
                  className="absolute left-stack-sm top-4 text-on-surface-variant font-body-md pointer-events-none transition-all duration-200 origin-left"
                  htmlFor="email"
                >
                  Identificador de Usuario / Email
                </label>
              </div>
              {/* Password Input */}
              <div className="relative floating-label-input">
                <input
                  className="w-full h-14 pt-4 pb-2 pl-stack-sm pr-10 border-b border-outline-variant focus:border-primary bg-transparent font-body-md transition-all duration-200"
                  id="password"
                  name="password"
                  placeholder=" "
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <label
                  className="absolute left-stack-sm top-4 text-on-surface-variant font-body-md pointer-events-none transition-all duration-200 origin-left"
                  htmlFor="password"
                >
                  Contraseña del Sistema
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-2 top-4 text-slate-400 hover:text-primary transition-colors p-1 cursor-pointer flex items-center justify-center"
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-outlined text-xl select-none">
                    {mostrarPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {error && (
                <div className="text-error text-sm mt-2 flex items-center gap-1 alert bg-red-50 p-2 rounded border border-red-200" style={{ color: '#ba1a1a' }}>
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-base">
                <label className="flex items-center gap-stack-sm cursor-pointer group">
                  <input
                    className="w-5 h-5 border-outline rounded bg-transparent text-primary focus:ring-0 focus:ring-offset-0 transition-all"
                    type="checkbox"
                  />
                  <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary">Recordarme</span>
                </label>
                <a className="font-label-md text-label-md text-primary hover:underline transition-colors" href="#">¿Olvidó su contraseña?</a>
              </div>
              <button
                className="w-full bg-primary-container text-white h-14 font-headline-md flex items-center justify-center gap-stack-sm hover:bg-primary transition-all active:scale-[0.98] rounded-lg disabled:opacity-50"
                type="submit"
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Portal</span>
                    <span className="material-symbols-outlined">login</span>
                  </>
                )}
              </button>
            </form>
          </div>
          {/* Footer Status */}
          <div className="absolute bottom-margin-desktop w-full max-w-md px-stack-md">
            <div className="flex flex-col md:flex-row items-center justify-between gap-stack-sm border-t border-outline-variant pt-stack-md">
              <div className="flex items-center gap-stack-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Sistema: Operativo</span>
              </div>
              <div className="text-on-surface-variant font-label-sm text-label-sm">
                <span className="font-bold">c3sar64 versión: 0.0.001</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
