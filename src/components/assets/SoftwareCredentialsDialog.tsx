import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { assetService } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Copy, Shield } from 'lucide-react';

interface SoftwareCredentialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
}

interface Credentials {
  username?: string;
  password?: string;
  apiKey?: string;
  licenseKey?: string;
  notes?: string;
}

export const SoftwareCredentialsDialog = ({
  isOpen,
  onClose,
  assetId,
}: SoftwareCredentialsDialogProps) => {
  const [credentials, setCredentials] = useState<Credentials>({});
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && assetId) {
      fetchCredentials();
    }
  }, [isOpen, assetId]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await assetService.getSoftwareCredentials(assetId);
      setCredentials(data.credentials || {});
    } catch (error: any) {
      console.error('Error fetching credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch software credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const maskValue = (value: string, show: boolean) => {
    if (!value) return '';
    return show ? value : '•'.repeat(Math.min(value.length, 12));
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Software Credentials
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Software Credentials
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            All credential information is encrypted and secure
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Username */}
          {credentials.username && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Username</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    value={credentials.username}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.username!, 'Username')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Password */}
          {credentials.password && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Password</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={maskValue(credentials.password, showPassword)}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.password!, 'Password')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Key */}
          {credentials.apiKey && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={maskValue(credentials.apiKey, showApiKey)}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.apiKey!, 'API Key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* License Key */}
          {credentials.licenseKey && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">License Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    value={credentials.licenseKey}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(credentials.licenseKey!, 'License Key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {credentials.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={credentials.notes}
                  readOnly
                  className="resize-none min-h-[100px]"
                />
              </CardContent>
            </Card>
          )}

          {/* No Credentials */}
          {!credentials.username && !credentials.password && !credentials.apiKey && !credentials.licenseKey && !credentials.notes && (
            <Card>
              <CardContent className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No credentials found for this software asset</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};