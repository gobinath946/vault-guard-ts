import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { companyService } from '@/services/companyService';
import { Eye, EyeOff, Save, Loader2, Cloud } from 'lucide-react';

interface S3ConfigFormProps {
  onSuccess?: () => void;
}

export const S3ConfigForm: React.FC<S3ConfigFormProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [formData, setFormData] = useState({
    accessKey: '',
    secretKey: '',
    region: '',
    bucket: '',
    s3Url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await companyService.getS3Config();
      setFormData({
        accessKey: config.accessKey || '',
        secretKey: config.hasSecretKey ? '********' : '',
        region: config.region || '',
        bucket: config.bucket || '',
        s3Url: config.s3Url || '',
      });
    } catch (error: any) {
      // Config might not exist yet, that's okay
      if (error.response?.status !== 404) {
        toast({
          title: 'Error',
          description: 'Failed to load S3 configuration',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await companyService.updateS3Config(formData);
      toast({
        title: 'Success',
        description: 'S3 configuration saved successfully',
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save S3 configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          S3 Storage Configuration
        </CardTitle>
        <CardDescription>
          Configure AWS S3 settings for file attachments. These credentials will be used to upload and manage attachments for passwords.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accessKey">Access Key ID *</Label>
              <Input
                id="accessKey"
                value={formData.accessKey}
                onChange={(e) => setFormData({ ...formData, accessKey: e.target.value })}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Access Key *</Label>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? 'text' : 'password'}
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave as ******** to keep existing secret key
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="us-east-1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bucket">Bucket Name *</Label>
              <Input
                id="bucket"
                value={formData.bucket}
                onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                placeholder="my-password-attachments"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s3Url">Custom S3 URL (Optional)</Label>
            <Input
              id="s3Url"
              value={formData.s3Url}
              onChange={(e) => setFormData({ ...formData, s3Url: e.target.value })}
              placeholder="https://my-bucket.s3.us-east-1.amazonaws.com"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use default AWS S3 URL format
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full md:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default S3ConfigForm;
