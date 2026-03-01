import { Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Brand & About */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-white">
              <Building2 className="h-8 w-8 text-orange-500" />
              <span className="text-2xl font-bold tracking-tight">RentalConnect</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Delhi NCR's most trusted platform for finding your perfect rental home. We connect tenants directly with verified owners and top-rated agents.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Search Properties</Link></li>
              <li><Link to="/register" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">List Your Property</Link></li>
              <li><Link to="/login" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">Agent Login</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">About Us</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} RentalConnect. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
