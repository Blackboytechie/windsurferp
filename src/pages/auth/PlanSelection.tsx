import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
  features: string[];
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    duration: 1, // 1 day trial
    features: [
      'Basic inventory management',
      'Up to 10 products',
      'Up to 5 customers',
      'Basic reporting',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 999,
    duration: 30, // 30 days
    features: [
      'Full inventory management',
      'Up to 100 products',
      'Up to 50 customers',
      'Standard reporting',
      'Email support',
    ],
    isPopular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2999,
    duration: 30, // 30 days
    features: [
      'Advanced inventory management',
      'Unlimited products',
      'Unlimited customers',
      'Advanced reporting',
      'Priority support',
      'Multi-currency support',
      'API access',
    ],
  },
];

export default function PlanSelection() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    
    try {
      // For free plan, just store the selection and proceed
      if (selectedPlan === 'free') {
        // Store the selected plan in localStorage to use during tenant creation
        localStorage.setItem('selectedPlan', selectedPlan);
        navigate('/auth/create-tenant');
        return;
      }
      
      // For paid plans, we would normally redirect to a payment page
      // For now, we'll just simulate this by storing the plan and redirecting
      localStorage.setItem('selectedPlan', selectedPlan);
      
      // In a real implementation, you would redirect to a payment gateway
      // After successful payment, the payment gateway would redirect back
      // to your create-tenant page with a payment confirmation
      
      // For demo purposes, we'll just go straight to tenant creation
      navigate('/auth/create-tenant');
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-gray-500 mt-2">Select the plan that best fits your business needs</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${
                selectedPlan === plan.id 
                  ? 'border-2 border-primary shadow-lg' 
                  : 'border border-gray-200'
              } ${plan.isPopular ? 'md:-mt-4' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-0 right-0 mx-auto w-fit px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
                  Most Popular
                </div>
              )}
              
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  {plan.price === 0 
                    ? 'Free for 1 day' 
                    : `₹${plan.price}/month`}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  variant={selectedPlan === plan.id ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <Button 
            size="lg" 
            disabled={!selectedPlan || loading}
            onClick={handleContinue}
          >
            {loading ? 'Processing...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}