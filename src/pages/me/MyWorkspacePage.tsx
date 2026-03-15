import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Thin wrapper that redirects the student to their own workspace URL,
 * resolving the student ID from the JWT (AuthContext) instead of the URL.
 * This avoids IDOR on the profile page while keeping WorkspacePage working.
 */
const MyWorkspacePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return <Navigate to={`/dashboard/student/${user.id}/workspace`} replace />;
};

export default MyWorkspacePage;
