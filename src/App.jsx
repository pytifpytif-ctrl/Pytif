import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { Spinner } from './components/ui.jsx'
import AppLayout from './components/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScheduleBuilder from './pages/ScheduleBuilder.jsx'
import ScheduleDetail from './pages/ScheduleDetail.jsx'
import History from './pages/History.jsx'
import Terms from './pages/Terms.jsx'
import Privacy from './pages/Privacy.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  // Google users (and anyone missing an Mpesa number) must complete onboarding
  // before they can use the app — the product can't send money without it.
  if (user.needs_onboarding && location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />
  }
  return children
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <Register />
          </RedirectIfAuthed>
        }
      />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/terms-of-service" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/privacy-policy" element={<Privacy />} />

      <Route
        path="/app/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="history" element={<History />} />
      </Route>

      {/* Full-screen flows (no bottom nav) */}
      <Route
        path="/app/new"
        element={
          <RequireAuth>
            <ScheduleBuilder />
          </RequireAuth>
        }
      />
      <Route
        path="/app/recycle/:id"
        element={
          <RequireAuth>
            <ScheduleBuilder />
          </RequireAuth>
        }
      />
      <Route
        path="/app/schedule/:id"
        element={
          <RequireAuth>
            <ScheduleDetail />
          </RequireAuth>
        }
      />

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
