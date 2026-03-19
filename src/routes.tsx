import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from '@/PrivateRoute';
import { LoginPage } from '@/pages/login/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CreateStudentPage } from '@/pages/students/CreateStudentPage';
import { StudentProfilePage } from '@/pages/students/StudentProfilePage';
import { BillingPage } from '@/pages/billing/BillingPage';
import ProfessorWorkspacePage from '@/pages/workspace/ProfessorWorkspacePage';
import StudentWorkspacePage from '@/pages/workspace/StudentWorkspacePage';
import { MyProfilePage } from '@/pages/me/MyProfilePage';
import { AccessDeniedPage } from '@/pages/errors/AccessDeniedPage';
import { AccountInactivePage } from '@/pages/errors/AccountInactivePage';

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
          <PrivateRoute requiredRoles={['TEACHER', 'ADMIN']}>
            <ProfessorWorkspacePage />
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

      {/* Student-only routes */}
      <Route
        path="/student/profile"
        element={
          <PrivateRoute requiredRoles={['STUDENT']}>
            <MyProfilePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/me"
        element={
          <PrivateRoute requiredRoles={['STUDENT']}>
            <MyProfilePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/student/workspace"
        element={
          <PrivateRoute requiredRoles={['STUDENT']}>
            <StudentWorkspacePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/me/workspace"
        element={
          <PrivateRoute requiredRoles={['STUDENT']}>
            <StudentWorkspacePage />
          </PrivateRoute>
        }
      />

      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="/account-inactive" element={<AccountInactivePage />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
