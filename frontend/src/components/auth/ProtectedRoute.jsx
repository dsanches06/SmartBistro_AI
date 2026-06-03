import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import TrophySpin from '@/components/ui/TrophySpin';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}>
        <TrophySpin message="A verificar sessão..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return <Outlet />;
}
