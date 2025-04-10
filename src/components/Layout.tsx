import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Public Changelog', href: '/changelog' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-blue-900 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <Link to="/" className="flex-shrink-0 flex items-center text-white text-xl font-bold">
                Diffy 
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Navigation Links */}
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    location.pathname === item.href
                      ? 'border-indigo-300 text-white'
                      : 'border-transparent text-indigo-100 hover:border-indigo-300 hover:text-white',
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition duration-150 ease-in-out'
                  )}
                  aria-current={location.pathname === item.href ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>
             {/* Mobile menu button (optional, add if needed) */}
             {/* <div className="-mr-2 flex items-center sm:hidden"> ... </div> */}
          </div>
        </div>
        {/* Mobile menu, show/hide based on menu state (optional) */}
        {/* <div className="sm:hidden" id="mobile-menu"> ... </div> */}
      </nav>

      {/* Main Content Area */}
      <main className="py-10 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet /> {/* This is where the page content will be rendered */}
        </div>
      </main>

      {/* Footer (Optional but recommended for professional look) */}
      <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
         <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
             © {new Date().getFullYear()} Diffy. All rights reserved.
         </div>
      </footer>
    </div>
  );
}