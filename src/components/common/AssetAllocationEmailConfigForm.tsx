import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Save } from 'lucide-react';
import { api } from '@/lib/api';

const AssetAllocationEmailConfigForm = () => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    to: '',
    infraEmail: '',
    subject: 'Asset Allocation Request - {{assetName}} for {{userName}}',
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Hardware Asset Allocation Request</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Hardware Asset Allocation Request</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear Team,</p>
        
        <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
          A new hardware asset allocation request requires your approval. Please review the details below and take appropriate action.
        </p>
        
        <!-- Details Table -->
        <table width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 30px;">
          <tr style="background-color: #f9fafb;">
            <td style="width: 35%; color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Employee Name</td>
            <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{userName}}</td>
          </tr>
          <tr>
            <td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0; background-color: #f9fafb;">Email Address</td>
            <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{userEmail}}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Asset Name</td>
            <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{assetName}}</td>
          </tr>
          <tr>
            <td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0; background-color: #f9fafb;">Brand & Model</td>
            <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{assetBrand}} {{assetModel}}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="color: #666666; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">Serial Number</td>
            <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">{{serialNumber}}</td>
          </tr>
          <tr>
            <td style="color: #666666; font-size: 14px; font-weight: 600; background-color: #f9fafb;">Remarks</td>
            <td style="color: #333333; font-size: 14px;">{{remarks}}</td>
          </tr>
        </table>
        
        <!-- Action Buttons -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 10px;">
                    <a href="{{approveLink}}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);">Approve</a>
                  </td>
                  <td style="padding-left: 10px;">
                    <a href="{{rejectLink}}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);">Reject</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <strong>Note:</strong> This is an automated request. Please click one of the buttons above to process this allocation. Each request can only be processed once.
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #888888; font-size: 12px; margin: 0;">
          Asset Management System | Automated Notification
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/company/asset-allocation-email-config');
      if (response.data) {
        setConfig(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching asset allocation email config:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put('/company/asset-allocation-email-config', config);
      toast({
        title: 'Success',
        description: 'Asset allocation email configuration updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Asset Allocation Email Configuration
        </CardTitle>
        <CardDescription>
          Configure email template for both hardware and software asset allocation requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To Email Address *</Label>
            <Input
              id="to"
              type="email"
              placeholder="infra@company.com"
              value={config.to}
              onChange={(e) => setConfig({ ...config, to: e.target.value })}
              required
            />
            <p className="text-sm text-muted-foreground">
              Email address where allocation requests will be sent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="infraEmail">Infra Team Email</Label>
            <Input
              id="infraEmail"
              type="email"
              placeholder="infra-team@company.com"
              value={config.infraEmail}
              onChange={(e) => setConfig({ ...config, infraEmail: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Email address where confirmation emails will be sent after approval (optional, defaults to "To Email" if not set)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              placeholder="Asset Allocation Request - {{assetName}} for {{userName}}"
              value={config.subject}
              onChange={(e) => setConfig({ ...config, subject: e.target.value })}
              required
            />
            <p className="text-sm text-muted-foreground">
              Subject will automatically show "Hardware" or "Software" based on asset type. Use variables like {'{{assetName}}'} and {'{{userName}}'} for dynamic content.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Body (HTML) *</Label>
            <Textarea
              id="body"
              placeholder="Enter HTML email template..."
              value={config.body}
              onChange={(e) => setConfig({ ...config, body: e.target.value })}
              rows={20}
              required
              disabled
              className="font-mono text-sm bg-muted cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground">
              This HTML template is pre-configured for both hardware and software allocations. The system automatically adjusts content based on asset type (Hardware/Software).
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssetAllocationEmailConfigForm;
