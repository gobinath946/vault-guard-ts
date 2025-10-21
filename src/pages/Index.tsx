import { Button } from '@/components/ui/button';
import { Shield, Lock, Key, Users, CheckCircle2, ArrowUp } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full p-0 shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <ArrowUp className="h-5 w-5 text-primary-foreground" />
        </Button>
      )}

      {/* Rest of your code remains exactly the same */}
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">SecurePro</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button onClick={() => navigate('/register')}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container pt-32 pb-20">
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 inline-flex rounded-full bg-primary/10 px-4 py-2">
            <span className="text-sm font-medium text-primary">Enterprise Password Management</span>
          </div>
          <h1 className="mb-6 max-w-4xl text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            Secure Your Passwords with
            <span className="text-primary"> Military-Grade Encryption</span>
          </h1>
          <p className="mb-10 max-w-2xl text-xl text-muted-foreground">
            SecurePro provides end-to-end encrypted password management for teams and enterprises.
            Keep your sensitive data safe with double-hashed passwords and AES-256 encryption.
          </p>
          <div className="flex gap-4">
            <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
              <Lock className="h-5 w-5" />
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">Why Choose SecurePro?</h2>
          <p className="text-lg text-muted-foreground">
            Enterprise-grade security meets user-friendly design
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">
              End-to-End Encryption
            </h3>
            <p className="text-muted-foreground">
              All passwords are encrypted with AES-256 before storage. Your data is secure at rest
              and in transit.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center">
            <div className="mb-4 rounded-full bg-secondary/20 p-4">
              <Key className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">
              Double Password Hashing
            </h3>
            <p className="text-muted-foreground">
              Passwords are hashed on the frontend and re-hashed on the backend for maximum
              security.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Share passwords securely with team members. Control who has access to what with
              granular permissions.
            </p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-foreground">
                Your Security is Our Priority
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">Zero-Knowledge Security</h4>
                    <p className="text-muted-foreground">
                      We never see your master password or decrypted data. Only you have access.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">
                      SOC 2 Type II Compliant
                    </h4>
                    <p className="text-muted-foreground">
                      Our infrastructure meets the highest security standards in the industry.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">Regular Security Audits</h4>
                    <p className="text-muted-foreground">
                      Independent third-party audits ensure our security remains bulletproof.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">
                      Advanced Password Generator
                    </h4>
                    <p className="text-muted-foreground">
                      Create strong, unique passwords with customizable complexity requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-8">
              <Shield className="mx-auto mb-6 h-32 w-32 text-primary" />
              <div className="space-y-4 text-center">
                <h3 className="text-2xl font-bold text-card-foreground">
                  Trusted by Thousands of Companies
                </h3>
                <p className="text-muted-foreground">
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
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to Secure Your Passwords?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Start your free trial today. No credit card required.
          </p>
          <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
            <Shield className="h-5 w-5" />
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">SecurePro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 SecurePro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;