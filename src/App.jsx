import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { Spinner } from './components/ui.jsx'
import AppLayout from './components/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScheduleBuilder from './pages/ScheduleBuilder.jsx'
import ScheduleDetail from './pages/ScheduleDetail.jsx'
import History from './pages/History.jsx'

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
