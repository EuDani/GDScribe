import { QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppThemeProvider } from '@/contexts/AppThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { queryClient } from '@/lib/queryClient'
import { RequireAuth } from '@/routes/RequireAuth'
import { RedirectIfAuthed } from '@/routes/RedirectIfAuthed'
import { ProjectLayout } from '@/routes/ProjectLayout'
import { LandingPage } from '@/features/landing/LandingPage'
import { AuthPage } from '@/features/auth/AuthPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { GddPage } from '@/features/gdd/GddPage'
import { StoryPage } from '@/features/story/StoryPage'
import { ReferencesPage } from '@/features/references/ReferencesPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { KanbanPage } from '@/features/kanban/KanbanPage'
import { IdeasPage } from '@/features/ideas/IdeasPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { ExportPage } from '@/features/export/ExportPage'
import { PrintExportPage } from '@/features/export/PrintExportPage'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppThemeProvider>
          <ToastProvider>
            <HashRouter>
              <Routes>
                <Route
                  path="/"
                  element={
                    <RedirectIfAuthed>
                      <LandingPage />
                    </RedirectIfAuthed>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <RedirectIfAuthed>
                      <AuthPage mode="login" />
                    </RedirectIfAuthed>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <RedirectIfAuthed>
                      <AuthPage mode="signup" />
                    </RedirectIfAuthed>
                  }
                />
                <Route path="/export/print/:projectId" element={<PrintExportPage />} />

                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <DashboardPage />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/project/:projectId"
                  element={
                    <RequireAuth>
                      <ProjectLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<OverviewPage />} />
                  <Route path="gdd" element={<GddPage />} />
                  <Route path="story" element={<StoryPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="references" element={<ReferencesPage />} />
                  <Route path="kanban" element={<KanbanPage />} />
                  <Route path="ideas" element={<IdeasPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="export" element={<ExportPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </HashRouter>
          </ToastProvider>
        </AppThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
