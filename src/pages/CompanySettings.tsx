import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Cloud, Settings as SettingsIcon, Shield, Mail, Package } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import S3ConfigForm from '@/components/common/S3ConfigForm';
import EmailConfigForm from '@/components/common/EmailConfigForm';
import AssetAllocationEmailConfigForm from '@/components/common/AssetAllocationEmailConfigForm';

const CompanySettings = () => {
  return (
    <DashboardLayout
      title="Company Settings"
      mainClassName="p-0 flex flex-col overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto w-full bg-muted/5 no-scrollbar">
        <Tabs defaultValue="storage" className="h-full flex flex-col">
          <div className="flex-none border-b bg-background sticky top-0 z-10 w-full px-6 pt-4">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent space-x-6">
              <TabsTrigger value="storage" className="flex items-center gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-none">
                <Cloud className="h-4 w-4" />
                Storage
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-none">
                <Mail className="h-4 w-4" />
                Email (SMTP)
              </TabsTrigger>
              <TabsTrigger value="asset-config" className="flex items-center gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-none">
                <Package className="h-4 w-4" />
                Asset Configuration
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-none">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-none">
                <SettingsIcon className="h-4 w-4" />
                General
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 w-full bg-muted/5">
            <TabsContent value="storage" className="m-0 space-y-4 focus-visible:ring-0">
              <S3ConfigForm />
            </TabsContent>

            <TabsContent value="email" className="m-0 space-y-4 focus-visible:ring-0">
              <EmailConfigForm />
            </TabsContent>

            <TabsContent value="asset-config" className="m-0 space-y-4 focus-visible:ring-0">
              <AssetAllocationEmailConfigForm />
            </TabsContent>

            <TabsContent value="security" className="m-0 space-y-4 focus-visible:ring-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Configure security options for your company
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Strong Passwords</Label>
                      <p className="text-sm text-muted-foreground">
                        Enforce minimum password complexity for all users
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Session Timeout</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out inactive users after 30 minutes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="m-0 space-y-4 focus-visible:ring-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                  <CardDescription>
                    Basic company configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow User Self-Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Let users request access to the system
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send email notifications for important events
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CompanySettings;
