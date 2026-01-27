import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, Loader2, Eye, EyeOff, Lock, FileCheck, Users, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hashPassword } from '@/lib/crypto';
import { api } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pinCode: z.string().min(4, 'Pin code is required'),
  country: z.string().min(2, 'Country is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Check URL parameter to determine initial mode
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      setIsRegisterMode(true);
    }
  }, [searchParams]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    shouldUnregister: false,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: '',
      email: '',
      contactName: '',
      phoneNumber: '',
      city: '',
      state: '',
      pinCode: '',
      country: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    const preservedEmail = data.email;
    const preservedPassword = data.password;

    try {
      setIsLoading(true);
      const hashedPassword = hashPassword(data.password);
      await login(data.email, hashedPassword);

      toast({ title: 'Success', description: 'Logged in successfully' });

      const userStr = sessionStorage.getItem('user');
      let userRole = '';
      if (userStr) {
        try { userRole = JSON.parse(userStr).role; } catch { }
      }
      navigate(userRole === 'company_user' ? '/password-creation' : '/dashboard');
    } catch (error: any) {
      loginForm.setValue('email', preservedEmail, { shouldValidate: false });
      loginForm.setValue('password', preservedPassword, { shouldValidate: false });

      toast({
        title: 'Error',
        description: error.message || error.response?.data?.message || 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      
      // Hash password on frontend (first hash)
      const hashedPassword = hashPassword(data.password);

      const registerData = {
        ...data,
        password: hashedPassword,
      };

      await api.post('/auth/register', registerData);

      toast({
        title: 'Success',
        description: 'Company registered successfully! Please login.',
      });

      // Switch to login mode after successful registration
      setIsRegisterMode(false);
      // Pre-fill email in login form
      loginForm.setValue('email', data.email);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setShowPassword(false);
    setShowConfirmPassword(false);
    // Reset forms when switching modes
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans antialiased">
      {/* Left Side - 70% Branding */}
      <div className="hidden lg:flex lg:w-[70%] relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-12 xl:p-20 overflow-hidden items-center justify-center">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Branding Content */}
        <div className="relative z-10 w-full max-w-5xl">
          {/* Logo Section */}
          <div className="flex items-center mb-16 space-x-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 blur-lg opacity-40 rounded-2xl"></div>
              <div className="relative bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
                <Shield className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight text-white mb-1">
                Secure<span className="text-blue-500">Pro</span>
              </h1>
              <p className="text-slate-400 text-lg font-medium">Enterprise-Grade Security Management</p>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="grid grid-cols-2 gap-8">
            <div className="group bg-white/[0.03] backdrop-blur-md p-8 rounded-3xl border border-white/[0.05] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all duration-300">
              <div className="bg-blue-600/10 p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <Lock className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Password Vault</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Advanced encryption with multi-layer hashing for maximum protection of your sensitive credentials.</p>
            </div>

            <div className="group bg-white/[0.03] backdrop-blur-md p-8 rounded-3xl border border-white/[0.05] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all duration-300">
              <div className="bg-blue-600/10 p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <FileCheck className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Asset Lifecycle</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Seamlessly track hardware and software assets from procurement to offboarding with detailed audit logs.</p>
            </div>

            <div className="group bg-white/[0.03] backdrop-blur-md p-8 rounded-3xl border border-white/[0.05] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all duration-300">
              <div className="bg-blue-600/10 p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Access</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Integrated RBAC system ensuring team members have the exact permissions they need to be productive.</p>
            </div>

            <div className="group bg-white/[0.03] backdrop-blur-md p-8 rounded-3xl border border-white/[0.05] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all duration-300">
              <div className="bg-blue-600/10 p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <Database className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Global Hierarchy</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Organize your workspace with logical collections, folders, and streamlined checkout workflows.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - 30% Auth Form */}
      <div className="w-full lg:w-[30%] flex items-start justify-center bg-white p-8 overflow-y-auto max-h-screen">
        <div className="w-full max-w-md py-4">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">SecurePro</h1>
          </div>

          {/* Form Header */}
          <div className="mb-10 text-center">
            {isRegisterMode && (
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600">
                <Shield className="h-8 w-8 text-white" />
              </div>
            )}
            <h1 className="text-4xl font-black text-slate-900 mb-4">
              {isRegisterMode ? 'Welcome to SecurePro' : 'Welcome Back'}
            </h1>
            <p className="text-xl font-semibold text-blue-600">
              {isRegisterMode ? 'Register your company to get started' : 'Sign in to your SecurePro account'}
            </p>
          </div>

          {/* Login Form */}
          {!isRegisterMode && (
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit, (errors) => console.log(errors))}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" className="h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pr-10 h-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
          )}

          {/* Register Form */}
          {isRegisterMode && (
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={registerForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corp" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="company@example.com" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="pinCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pin Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pr-10 h-10"
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pr-10 h-10"
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register Company
                </Button>
              </form>
            </Form>
          )}

          {/* Toggle between Login/Register */}
          <div className="mt-5 text-center text-sm">
            <span className="text-muted-foreground">
              {isRegisterMode ? "Already have an account? " : "Don't have an account? "}
            </span>
            <Button 
              variant="link" 
              className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700" 
              onClick={toggleMode}
              disabled={isLoading}
            >
              {isRegisterMode ? "Login here" : "Register here"}
            </Button>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
