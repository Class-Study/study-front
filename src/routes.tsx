import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from '@/PrivateRoute';
import { LoginPage } from '@/pages/login/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { StudentsPage } from '@/pages/students/StudentsPage';
import { StudentProfilePage } from '@/pages/students/StudentProfilePage';
import { BillingPage } from '@/pages/billing/BillingPage';
import { WorkspacePage } from '@/pages/workspace/WorkspacePage';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <DashboardPage />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/students"
        element={
          <PrivateRoute requiredRoles={['TEACHER']}>
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <StudentsPage />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/students/:id"
        element={
          <PrivateRoute requiredRoles={['TEACHER']}>
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <StudentProfilePage />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/students/:studentId/workspace"
        element={
          <PrivateRoute>
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <WorkspacePage />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <PrivateRoute requiredRoles={['TEACHER']}>
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <BillingPage />
            </div>
          </PrivateRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
