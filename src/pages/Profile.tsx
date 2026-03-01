import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Calendar, Shield } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please login to view profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <User className="h-6 w-6" />
              My Profile
            </h1>
            <p className="text-orange-100 mt-1 text-sm">Manage your personal information</p>
          </div>
          
          <div className="px-8 py-8">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="h-24 w-24 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 text-3xl font-bold border-4 border-white shadow-lg mb-4">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 mt-1 capitalize">
                {user.role} Account
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="group bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Full Name</label>
                <div className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  {user.name}
                </div>
              </div>

              <div className="group bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Email Address</label>
                <div className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  {user.email}
                </div>
              </div>

              <div className="group bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Phone Number</label>
                <div className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  {user.phone || 'Not provided'}
                </div>
              </div>

              <div className="group bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Account Type</label>
                <div className="text-base font-medium text-gray-900 flex items-center gap-2 capitalize">
                  <Shield className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  {user.role}
                </div>
              </div>

              <div className="group bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Onboarding Date</label>
                <div className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
