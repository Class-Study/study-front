import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from '@/PrivateRoute';
import { LoginPage } from '@/pages/login/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CreateStudentPage } from '@/pages/students/CreateStudentPage';
import { StudentProfilePage } from '@/pages/students/StudentProfilePage';
import { BillingPage } from '@/pages/billing/BillingPage';
import { WorkspacePage } from '@/pages/workspace/WorkspacePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/student/new"
        element={
          <PrivateRoute requiredRoles={['TEACHER', 'ADMIN']}>
            <CreateStudentPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/student/:id"
        element={
          <PrivateRoute requiredRoles={['TEACHER', 'ADMIN']}>
            <StudentProfilePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/student/:studentId/workspace"
        element={
          <PrivateRoute>
            <WorkspacePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <PrivateRoute requiredRoles={['TEACHER', 'ADMIN']}>
            <BillingPage />
          </PrivateRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
