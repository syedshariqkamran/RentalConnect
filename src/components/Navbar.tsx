import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, LogOut, User as UserIcon, LayoutDashboard, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">RentalConnect</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/profile" className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors">
                <UserIcon className="h-4 w-4" />
                <span>{user.name} ({user.role})</span>
              </Link>
              
              {user.role === 'agent' && (
                <Link 
                  to="/agent" 
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    location.pathname === '/agent' 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              )}

              {user.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    location.pathname === '/admin' 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}

              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
