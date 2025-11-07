import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Users, FileText, Globe } from 'lucide-react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold text-foreground">SecurePro</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-muted-foreground">|</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Privacy Policy</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-8">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <div className="relative bg-primary/10 p-6 rounded-full border border-primary/20">
                  <Lock className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              SecurePro Autofill – Your Privacy is Our Priority
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>Last Updated: November 07, 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-16">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="space-y-8">

            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="pt-10 pb-10 px-10">
                <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
                  <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-6 rounded-xl border border-primary/20 mb-8">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold mb-3 text-foreground">
                          SecurePro Autofill ("we", "our", "the extension") is a secure password management and autofill solution developed by QR Solutions.
                        </p>
                        <p className="text-muted-foreground">
                          This Privacy Policy explains how we collect, use, store, and protect your information when you use our website and Chrome extension.
                          Your privacy and data security are our highest priority.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-8 mb-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">1. Information We Collect</h2>
                  </div>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">1.1 Information You Provide</h3>
                  <ul className="mb-4">
                    <li>Email address (for account creation and login)</li>
                    <li>Master password (never stored or transmitted — used only to generate encryption keys locally on your device)</li>
                  </ul>

                  <h3 className="text-lg font-medium mt-4 mb-2">1.2 Credentials Saved by You</h3>
                  <ul className="mb-4">
                    <li>Website usernames</li>
                    <li>Website passwords</li>
                    <li>Additional login metadata (e.g., website URL)</li>
                  </ul>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 mb-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-green-100 dark:bg-green-800 p-1 rounded-full mt-0.5">
                        <span className="text-green-600 dark:text-green-400 text-sm">✅</span>
                      </div>
                      <span className="font-medium text-green-800 dark:text-green-200">All credentials are encrypted locally on your device before being sent to our backend.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 dark:bg-green-800 p-1 rounded-full mt-0.5">
                        <span className="text-green-600 dark:text-green-400 text-sm">✅</span>
                      </div>
                      <span className="font-medium text-green-800 dark:text-green-200">We cannot read, decrypt, or access your passwords at any time.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-10 mb-4">
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                      <Globe className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">2. Information the Extension Collects Automatically</h2>
                  </div>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">2.1 Website Interaction (for autofill)</h3>
                  <p className="mb-2">The extension detects:</p>
                  <ul className="mb-4">
                    <li>The URL of the active tab</li>
                    <li>Form fields (username/password inputs)</li>
                  </ul>
                  <p className="mb-4">This is required to provide autofill functionality.</p>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 mb-6">
                    <div className="grid gap-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 dark:bg-green-800 p-1 rounded-full mt-0.5">
                          <span className="text-green-600 dark:text-green-400 text-sm">✅</span>
                        </div>
                        <span className="font-medium text-green-800 dark:text-green-200">No browsing history is collected</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 dark:bg-green-800 p-1 rounded-full mt-0.5">
                          <span className="text-green-600 dark:text-green-400 text-sm">✅</span>
                        </div>
                        <span className="font-medium text-green-800 dark:text-green-200">No unrelated page content is read</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 dark:bg-green-800 p-1 rounded-full mt-0.5">
                          <span className="text-green-600 dark:text-green-400 text-sm">✅</span>
                        </div>
                        <span className="font-medium text-green-800 dark:text-green-200">No data is shared with third parties</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mt-4 mb-2">2.2 Storage Usage</h3>
                  <p className="mb-2">We store:</p>
                  <ul className="mb-4">
                    <li>Encrypted credentials</li>
                    <li>User preferences</li>
                    <li>Session tokens</li>
                  </ul>
                  <p className="mb-4">These are stored using Chrome's secure storage API.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
                  <p className="mb-2">We use your information to:</p>
                  <ul className="mb-4">
                    <li>Sync encrypted credentials between devices</li>
                    <li>Provide secure autofill on websites</li>
                    <li>Authenticate your account</li>
                    <li>Enhance user experience and functionality</li>
                  </ul>
                  <p className="mb-4 font-medium">We do not sell, rent, or share your data with any third parties.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">4. Backend & API Communication</h2>
                  <p className="mb-2">SecurePro Autofill securely communicates with our servers:</p>
                  <ul className="mb-4">
                    <li>Frontend: <a href="https://dev.secure.qrsolutions.in/" className="text-blue-600 hover:underline">https://dev.secure.qrsolutions.in/</a></li>
                    <li>Backend API: <a href="https://dev.secure-backend.qrsolutions.in/" className="text-blue-600 hover:underline">https://dev.secure-backend.qrsolutions.in/</a></li>
                  </ul>
                  
                  <p className="mb-2">All data transferred between your device and our servers is:</p>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                    <p className="flex items-start mb-2">
                      <span className="mr-2">✅</span>
                      <span>Encrypted end-to-end</span>
                    </p>
                    <p className="flex items-start">
                      <span className="mr-2">✅</span>
                      <span>Protected using TLS (HTTPS)</span>
                    </p>
                  </div>
                  <p className="mb-4 font-medium">We never store plaintext passwords.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">5. How We Protect Your Data</h2>
                  <p className="mb-2">We use industry-leading security practices:</p>
                  <ul className="mb-4">
                    <li>AES-256 encryption</li>
                    <li>Zero-knowledge architecture</li>
                    <li>Transport Layer Security</li>
                    <li>Strict data access controls</li>
                  </ul>
                  <p className="mb-4 font-medium">We cannot access or view your stored credentials.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">6. Chrome Extension Permissions</h2>
                  <p className="mb-4">SecurePro Autofill uses the following Chrome permissions only for intended functionality:</p>
                  
                  <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse border border-border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border border-border px-4 py-2 text-left font-semibold">Permission</th>
                          <th className="border border-border px-4 py-2 text-left font-semibold">Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-muted/50">
                          <td className="border border-border px-4 py-2 text-sm">activeTab</td>
                          <td className="border border-border px-4 py-2 text-sm">Detect autofill opportunities on the current tab</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="border border-border px-4 py-2 text-sm">tabs</td>
                          <td className="border border-border px-4 py-2 text-sm">Identify the website domain for matching credentials</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="border border-border px-4 py-2 text-sm">host permissions</td>
                          <td className="border border-border px-4 py-2 text-sm">Autofill login forms on websites the user visits</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="border border-border px-4 py-2 text-sm">scripting</td>
                          <td className="border border-border px-4 py-2 text-sm">Inject form-processing scripts to fill credentials</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="border border-border px-4 py-2 text-sm">storage</td>
                          <td className="border border-border px-4 py-2 text-sm">Store encrypted data and user preferences</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="border border-border px-4 py-2 text-sm">Remote code</td>
                          <td className="border border-border px-4 py-2 text-sm">Connect securely to our backend API endpoints</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="mb-4">We do not collect any extra data beyond what is required for secure autofill.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">7. Third-Party Sharing</h2>
                  <p className="mb-2">We do not share your data with:</p>
                  <ul className="mb-4">
                    <li>Advertisers</li>
                    <li>Analytics platforms</li>
                    <li>Data brokers</li>
                    <li>Third-party services</li>
                  </ul>
                  <p className="mb-4 font-medium">Only QR Solutions' secure backend interacts with the extension.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">8. Data Retention</h2>
                  <p className="mb-2">Your encrypted vault data is stored on our servers only as long as your account is active.</p>
                  <p className="mb-4 font-medium">If you delete your account, all related data is permanently erased from our systems.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">9. Your Rights</h2>
                  <p className="mb-2">You can:</p>
                  <ul className="mb-4">
                    <li>Delete your account</li>
                    <li>Export your data</li>
                    <li>Update your stored credentials</li>
                    <li>Request complete deletion of all stored information</li>
                  </ul>
                  <p className="mb-4">
                    Contact us anytime at: <a href="mailto:support@qrsolutions.in" className="text-blue-600 hover:underline">support@qrsolutions.in</a>
                  </p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">10. Children's Privacy</h2>
                  <p className="mb-2">SecurePro Autofill is not intended for users under the age of 13.</p>
                  <p className="mb-4">We do not knowingly collect information from children.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">11. Changes to This Policy</h2>
                  <p className="mb-2">We may update this Privacy Policy as needed.</p>
                  <p className="mb-4">Updates will be posted on this page with a revised "Last Updated" date.</p>

                  <h2 className="text-xl font-semibold mt-6 mb-3">12. Contact Us</h2>
                  <p className="mb-2">If you have any questions about this Privacy Policy or data usage, please contact:</p>
                  <p className="mb-2">
                    <a href="mailto:support@qrsolutions.in" className="text-blue-600 hover:underline">support@qrsolutions.in</a>
                  </p>
                  <p>
                    <a href="https://dev.secure.qrsolutions.in/" className="text-blue-600 hover:underline">https://dev.secure.qrsolutions.in/</a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

