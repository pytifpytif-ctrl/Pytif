import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { Spinner } from './components/ui.jsx'
import AppPasscodeGate from './components/AppPasscodeGate.jsx'
import AppLayout from './components/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ResetPasscode from './pages/ResetPasscode.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScheduleBuilder from './pages/ScheduleBuilder.jsx'
import ScheduleDetail from './pages/ScheduleDetail.jsx'
import AddFunds from './pages/AddFunds.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'
import Notifications from './pages/Notifications.jsx'
import Analytics from './pages/Analytics.jsx'
import Terms from './pages/Terms.jsx'
import Privacy from './pages/Privacy.jsx'

function RequireAuthOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <AppPasscodeGate userId={user.id}>{children}</AppPasscodeGate>
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
      <Route
        path="/reset-passcode"
        element={
          <RequireAuthOnly>
            <ResetPasscode />
          </RequireAuthOnly>
        }
      />
      <Route path="/terms" element={<Terms />} />
      <Route path="/terms-of-service" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/privacy-policy" element={<Privacy />} />

      {/* Old onboarding path now lives in Settings */}
      <Route path="/app/onboarding" element={<Navigate to="/app/settings" replace />} />

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
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<Analytics />} />
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
      <Route
        path="/app/schedule/:id/add-funds"
        element={
          <RequireAuth>
            <AddFunds />
          </RequireAuth>
        }
      />

      <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
