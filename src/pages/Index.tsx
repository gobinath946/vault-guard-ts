import { Button } from '@/components/ui/button';
import { Shield, Lock, Key, Users, CheckCircle2, ArrowUp, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Reset scroll position when component mounts
  useEffect(() => {
    // Scroll to top immediately when page loads
    window.scrollTo(0, 0);
    
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Cleanup function
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full p-0 shadow-lg bg-blue-600 hover:bg-blue-700"
          size="icon"
        >
          <ArrowUp className="h-5 w-5 text-white" />
        </Button>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900">Secure<span className="text-blue-600">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="text-slate-700 hover:text-slate-900">
              Login
            </Button>
            <Button onClick={() => navigate('/register')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container pt-32 pb-20">
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 inline-flex rounded-full bg-blue-50 px-4 py-2 border border-blue-100">
            <span className="text-sm font-semibold text-blue-600">Enterprise Password Management</span>
          </div>
          <h1 className="mb-6 max-w-4xl text-5xl font-black tracking-tight text-slate-900 md:text-6xl">
            Secure Your Passwords with
            <span className="text-blue-600"> Military-Grade Encryption</span>
          </h1>
          <p className="mb-10 max-w-2xl text-xl text-slate-600 leading-relaxed">
            SecurePro provides end-to-end encrypted password management for teams and enterprises.
            Keep your sensitive data safe with double-hashed passwords and AES-256 encryption.
          </p>
          <div className="flex gap-4">
            <Button size="lg" onClick={() => navigate('/register')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 h-12 px-8 text-base font-semibold">
              <Lock className="h-5 w-5" />
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="border-slate-300 text-slate-700 hover:bg-slate-50 h-12 px-8 text-base font-semibold">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-black text-slate-900">Why Choose SecurePro?</h2>
          <p className="text-lg text-slate-600">
            Enterprise-grade security meets user-friendly design
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="group flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center hover:border-blue-500/30 hover:shadow-xl transition-all duration-300">
            <div className="mb-4 rounded-xl bg-blue-600/10 p-4 group-hover:scale-110 transition-transform">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              End-to-End Encryption
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              All passwords are encrypted with AES-256 before storage. Your data is secure at rest
              and in transit.
            </p>
          </div>

          <div className="group flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center hover:border-blue-500/30 hover:shadow-xl transition-all duration-300">
            <div className="mb-4 rounded-xl bg-blue-600/10 p-4 group-hover:scale-110 transition-transform">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              Double Password Hashing
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Passwords are hashed on the frontend and re-hashed on the backend for maximum
              security.
            </p>
          </div>

          <div className="group flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center hover:border-blue-500/30 hover:shadow-xl transition-all duration-300">
            <div className="mb-4 rounded-xl bg-blue-600/10 p-4 group-hover:scale-110 transition-transform">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Team Collaboration</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Share passwords securely with team members. Control who has access to what with
              granular permissions.
            </p>
          </div>

          <div className="group flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center hover:border-blue-500/30 hover:shadow-xl transition-all duration-300">
            <div className="mb-4 rounded-xl bg-blue-600/10 p-4 group-hover:scale-110 transition-transform">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Asset Management</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Track hardware and software assets from procurement to offboarding with detailed audit logs.
            </p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-6 text-3xl font-black text-slate-900">
                Your Security is Our Priority
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-600" />
                  <div>
                    <h4 className="mb-1 font-bold text-slate-900">Zero-Knowledge Security</h4>
                    <p className="text-slate-600 text-sm">
                      We never see your master password or decrypted data. Only you have access.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-600" />
                  <div>
                    <h4 className="mb-1 font-bold text-slate-900">
                      SOC 2 Type II Compliant
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Our infrastructure meets the highest security standards in the industry.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-600" />
                  <div>
                    <h4 className="mb-1 font-bold text-slate-900">Regular Security Audits</h4>
                    <p className="text-slate-600 text-sm">
                      Independent third-party audits ensure our security remains bulletproof.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-600" />
                  <div>
                    <h4 className="mb-1 font-bold text-slate-900">
                      Advanced Password Generator
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Create strong, unique passwords with customizable complexity requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 p-12 shadow-xl">
              <Shield className="mx-auto mb-6 h-32 w-32 text-blue-600" />
              <div className="space-y-4 text-center">
                <h3 className="text-2xl font-black text-slate-900">
                  Trusted by Thousands of Companies
                </h3>
                <p className="text-slate-600">
                  Join organizations worldwide that trust SecurePro to protect their most sensitive
                  credentials.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 p-12 text-center shadow-lg">
          <h2 className="mb-4 text-3xl font-black text-slate-900">
            Ready to Secure Your Passwords?
          </h2>
          <p className="mb-8 text-lg text-slate-600">
            Start your free trial today. No credit card required.
          </p>
          <Button size="lg" onClick={() => navigate('/register')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 h-12 px-8 text-base font-semibold">
            <Shield className="h-5 w-5" />
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-black text-slate-900">Secure<span className="text-blue-600">Pro</span></span>
            </div>
            <p className="text-sm text-slate-600">
              © 2024 SecurePro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;