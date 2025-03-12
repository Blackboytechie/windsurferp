import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">WindsurferP</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/auth/login')}>
              Log in
            </Button>
            <Button onClick={() => navigate('/auth/register')}>
              Sign up
            </Button>
          </div>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Streamline Your Business Operations
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              All-in-one ERP solution for inventory management, sales, purchases, and more.
            </p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={() => navigate('/auth/plans')}>
                Get Started
              </Button>
            </div>
          </div>
          
          <div className="mt-20">
            <h3 className="text-2xl font-bold text-center mb-10">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-lg font-semibold mb-2">Inventory Management</h4>
                <p className="text-gray-600">Track stock levels, manage products, and handle inventory movements.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-lg font-semibold mb-2">Sales & Invoicing</h4>
                <p className="text-gray-600">Create sales orders, generate invoices, and manage customer relationships.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-lg font-semibold mb-2">Purchase Management</h4>
                <p className="text-gray-600">Handle supplier relationships, create purchase orders, and track bills.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white mt-20 py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">© 2023 WindsurferP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}