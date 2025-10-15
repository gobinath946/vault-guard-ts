import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Eye, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Password {
  _id: string;
  itemName: string;
  username: string;
  password: string;
  websiteUrl: string;
}

const CompanyUserDashboard = () => {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    try {
      const response = await api.get('/passwords');
      setPasswords(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch passwords',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = async (id: string) => {
    try {
      if (!visiblePasswords.has(id)) {
        const response = await api.get(`/passwords/${id}`);
        const decryptedPassword = response.data;
        
        setPasswords((prev) =>
          prev.map((p) => (p._id === id ? decryptedPassword : p))
        );
        
        setVisiblePasswords((prev) => new Set(prev).add(id));
      } else {
        setVisiblePasswords((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to decrypt password',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="My Passwords">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Passwords">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Passwords</h2>
          <p className="text-muted-foreground">View passwords shared with you</p>
        </div>

        {passwords.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                No passwords have been shared with you yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {passwords.map((password) => (
              <Card key={password._id}>
                <CardHeader>
                  <CardTitle className="text-lg">{password.itemName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Username</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono">
                        {visiblePasswords.has(password._id)
                          ? password.username
                          : '••••••••'}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(password.username, 'Username')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Password</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono">
                        {visiblePasswords.has(password._id)
                          ? password.password
                          : '••••••••'}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePasswordVisibility(password._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(password.password, 'Password')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {password.websiteUrl && (
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <a
                        href={password.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {password.websiteUrl}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompanyUserDashboard;
