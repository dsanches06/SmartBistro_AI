import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import TrophySpin from '@/components/ui/TrophySpin';

// Restringe o acesso às áreas administrativas ao utilizador admin.
export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}>
        <TrophySpin message="A verificar sessão..." />
      </div>
    );
  }

  // Utilizadores normais (role_id=2) só acedem ao seu perfil
  if (!user || user.role_id !== 1) return <Navigate to="/perfil" replace />;

  return <Outlet />;
}
