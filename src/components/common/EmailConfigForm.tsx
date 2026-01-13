import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { companyService } from '@/services/companyService';
import { Eye, EyeOff, Save, Loader2, Mail } from 'lucide-react';

interface EmailConfigFormProps {
    onSuccess?: () => void;
}

export const EmailConfigForm: React.FC<EmailConfigFormProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [formData, setFormData] = useState({
        service: 'gmail',
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        from: '',
    });
    const { toast } = useToast();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const config = await companyService.getEmailConfig();
            setFormData({
                service: config.service || 'gmail',
                host: config.host || '',
                port: config.port || 587,
                secure: config.secure || false,
                user: config.user || '',
                pass: config.hasPass ? '********' : '',
                from: config.from || '',
            });
        } catch (error: any) {
            if (error.response?.status !== 404) {
                toast({
                    title: 'Error',
                    description: 'Failed to load email configuration',
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
            await companyService.updateEmailConfig(formData);
            toast({
                title: 'Success',
                description: 'Email configuration saved successfully',
            });
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save email configuration',
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
                    <Mail className="h-5 w-5" />
                    Email (SMTP) Configuration
                </CardTitle>
                <CardDescription>
                    Configure email settings for sending offboarding reports and notifications.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="service">Email Service</Label>
                            <Select
                                value={formData.service}
                                onValueChange={(value) => setFormData({ ...formData, service: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gmail">Gmail</SelectItem>
                                    <SelectItem value="outlook">Outlook</SelectItem>
                                    <SelectItem value="custom">Custom (SMTP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="from">From Email Address</Label>
                            <Input
                                id="from"
                                type="email"
                                value={formData.from}
                                onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                                placeholder="noreply@company.com"
                            />
                        </div>
                    </div>

                    {formData.service === 'custom' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md bg-muted/20">
                            <div className="space-y-2">
                                <Label htmlFor="host">SMTP Host</Label>
                                <Input
                                    id="host"
                                    value={formData.host}
                                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                    placeholder="smtp.example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    value={formData.port}
                                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                    placeholder="587"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-8">
                                <Switch
                                    id="secure"
                                    checked={formData.secure}
                                    onCheckedChange={(checked) => setFormData({ ...formData, secure: checked })}
                                />
                                <Label htmlFor="secure">Secure (SSL/TLS)</Label>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="user">SMTP Username / Email *</Label>
                            <Input
                                id="user"
                                value={formData.user}
                                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                                placeholder="user@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pass">SMTP Password / App Password *</Label>
                            <div className="relative">
                                <Input
                                    id="pass"
                                    type={showPass ? 'text' : 'password'}
                                    value={formData.pass}
                                    onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                                    placeholder="your-password"
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowPass(!showPass)}
                                >
                                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Leave as ******** to keep existing password
                            </p>
                        </div>
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
                                Save Email Configuration
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default EmailConfigForm;
