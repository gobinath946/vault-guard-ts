import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { checkoutService, CheckoutProcess } from '@/services/checkoutService';
import { companyService, User } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import {
    CheckCircle2,
    Circle,
    ChevronRight,
    ChevronLeft,
    Upload,
    Mail,
    Shield,
    AppWindow,
    Database,
    Fingerprint,
    Laptop,
    CheckSquare,
    UserCheck,
    FileText,
    Users,
    Search,
    Check,
    ChevronsUpDown,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { assetService } from '@/services/assetService';
import { HardDrive, Package, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { CheckoutStepAttachment } from './CheckoutStepAttachment';

const getUserId = (user: any) => {
    if (!user) return null;
    if (typeof user === 'string') return user;
    return user._id || user.id;
};

interface CheckoutWizardProps {
    checkoutId: string | null;
    onClose: () => void;
}

const steps = [
    { title: 'User Selection', icon: Users },
    { title: 'HR Confirmation', icon: Upload },
    { title: 'Email Revocation', icon: Mail },
    { title: 'VPN Access', icon: Shield },
    { title: 'Application Access', icon: AppWindow },
    { title: 'DB & Server Access', icon: Database },
    { title: 'Biometric Access', icon: Fingerprint },
    { title: 'Asset Verification', icon: Laptop },
    { title: 'Report Review', icon: FileText },
    { title: 'Email Report', icon: Mail },
];

const CheckoutWizard = ({ checkoutId, onClose }: CheckoutWizardProps) => {
    const [checkout, setCheckout] = useState<CheckoutProcess | null>(null);
    const [assets, setAssets] = useState<any>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(checkoutId ? 1 : 0); // Start at step 0 (user selection) if no checkoutId
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const { toast } = useToast();

    // User selection states
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    // Step specific states
    const [hrFile, setHrFile] = useState<any>(null);
    const [hrConfirmation, setHrConfirmation] = useState<any>({
        relievingEmailReceived: false,
        lastWorkingDayConfirmed: false,
        documentationCompleted: false,
        remark: ''
    });
    const [appAccess, setAppAccess] = useState<any>({
        TimeDoctor: false,
        '3CX': false,
        Bitbucket: false,
        'Other Internal Tools': false,
        'Third-Party Applications': false,
        'User Account Verification': false,
        remark: ''
    });
    const [dbAccess, setDbAccess] = useState<any>({
        dbUsers: false,
        sshAccess: false,
        credentialRotation: false,
        remark: ''
    });
    const [returnedAssets, setReturnedAssets] = useState<any>({});
    const [assetCheckerData, setAssetCheckerData] = useState<any>(null);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [emailRevocation, setEmailRevocation] = useState<any>({
        loginBlocked: false,
        passwordReset: false,
        emailForwarding: false,
        remark: ''
    });
    const [vpnAccess, setVpnAccess] = useState<any>({
        companyServers: false,
        databases: false,
        internalNetworks: false,
        remark: ''
    });
    const [biometricAccess, setBiometricAccess] = useState<any>({
        fingerprintRemoved: false,
        attendanceBlocked: false,
        remark: ''
    });

    const [emailConfig, setEmailConfig] = useState<any>({
        to: [],
        cc: [],
        subject: '',
        body: ''
    });
    const [resendingEmail, setResendingEmail] = useState(false);
    const [showEmailConfig, setShowEmailConfig] = useState(false);

    useEffect(() => {
        if (checkoutId) {
            fetchCheckoutDetails(false);
        } else {
            fetchUsers();
            setLoading(false);
        }
    }, [checkoutId]);

    useEffect(() => {
        if ((currentStepIndex === 0 || currentStepIndex === 9) && users.length === 0) {
            fetchUsers();
        }
    }, [currentStepIndex, users.length]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            // Fetch all active users (no search filter, Command component handles search)
            const usersData = await companyService.getUsers(1, 1000, '');
            const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
            // Filter for active users
            setUsers(usersList.filter((u: any) => u.isActive));
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to fetch users',
                variant: 'destructive',
            });
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchAssetCheckerData = async (userId: string) => {
        if (!userId) {
            console.error('No userId provided to fetchAssetCheckerData');
            return;
        }

        try {
            setLoadingAssets(true);
            setAssetCheckerData(null); // Reset data to show loading state

            const data = await assetService.getAssetChecker(userId);

            // Validate the data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid asset data received from server');
            }

            // Ensure we always have a valid structure
            const validatedData = {
                user: data.user || { _id: userId, username: 'Unknown', email: 'Unknown' },
                hardware: Array.isArray(data.hardware) ? data.hardware : [],
                software: Array.isArray(data.software) ? data.software : []
            };

            setAssetCheckerData(validatedData);

        } catch (error: any) {
            console.error('Error fetching asset checker data:', error);
            // Set empty data structure on error so UI doesn't show loading forever
            setAssetCheckerData({
                user: { _id: userId, username: 'Unknown', email: 'Unknown' },
                hardware: [],
                software: []
            });
            toast({
                title: 'Error',
                description: `Failed to fetch asset data: ${error.message}`,
                variant: 'destructive'
            });
        } finally {
            setLoadingAssets(false);
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800 hover:bg-green-100';
            case 'EXPIRED':
                return 'bg-red-100 text-red-800 hover:bg-red-100';
            case 'RETURNED':
                return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
            case 'DELETED':
                return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
            default:
                return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
        }
    };

    const getExpiryStatus = (expiryDate?: string, allocationStatus?: string) => {
        if (allocationStatus === 'EXPIRED') {
            return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-50' };
        }

        if (allocationStatus === 'ACTIVE' && expiryDate) {
            const expiry = new Date(expiryDate);
            const current = new Date();
            const diffDays = Math.ceil((expiry.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-50' };
            } else if (diffDays <= 7) {
                return { status: 'expiring-soon', color: 'text-orange-600', bgColor: 'bg-orange-50' };
            } else if (diffDays <= 30) {
                return { status: 'expiring-month', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
            }
        }

        return { status: 'active', color: 'text-green-600', bgColor: 'bg-green-50' };
    };

    const handleDeleteAllocation = async (e: React.MouseEvent, type: 'hardware' | 'software', allocationId: string) => {
        e.stopPropagation();
        try {
            if (type === 'hardware') {
                await assetService.deleteHardwareAllocation(allocationId);
            } else {
                await assetService.deleteSoftwareAllocation(allocationId);
            }

            toast({
                title: 'Success',
                description: `${type} allocation deleted successfully`,
            });

            // Refresh data
            const currentUserId = getUserId(checkout?.userId);
            if (currentUserId) {
                fetchAssetCheckerData(currentUserId);
            }
        } catch (error: any) {
            console.error('Error deleting allocation:', error);
            toast({
                title: 'Error',
                description: `Failed to delete ${type} allocation`,
                variant: 'destructive',
            });
        }
    };

    useEffect(() => {
        const userId = getUserId(checkout?.userId);

        if (currentStepIndex === 7 && userId && !assetCheckerData && !loadingAssets) {
            fetchAssetCheckerData(userId);
        }
    }, [currentStepIndex, checkout?.userId, assetCheckerData, loadingAssets]);

    // Additional useEffect to ensure asset data is fetched when step 7 is reached
    useEffect(() => {
        const userId = getUserId(checkout?.userId);
        if (currentStepIndex === 7 && userId) {
            // Always try to fetch asset data when entering step 7, even if we think we have it
            // This ensures fresh data and handles cases where the previous fetch failed silently
            const timeoutId = setTimeout(() => {
                if (!assetCheckerData && !loadingAssets) {
                    fetchAssetCheckerData(userId);
                }
            }, 1000); // Give 1 second for normal fetch to complete

            return () => clearTimeout(timeoutId);
        }
    }, [currentStepIndex, checkout?.userId]);

    // Reset asset data when leaving step 7 to ensure fresh data on return
    useEffect(() => {
        if (currentStepIndex !== 7 && assetCheckerData) {
            setAssetCheckerData(null);
        }
    }, [currentStepIndex]);

    // Debug logging
    useEffect(() => {
    }, [checkout, currentStepIndex, loading, checkoutId]);

    // Add timeout for checkout loading
    useEffect(() => {
        if (loading && checkoutId) {
            const timeout = setTimeout(() => {
                if (loading) {
                    console.error('Checkout loading timeout - forcing retry');
                    setLoading(false);
                    toast({
                        title: 'Loading Timeout',
                        description: 'Checkout data is taking too long to load. Please try refreshing.',
                        variant: 'destructive',
                    });
                }
            }, 15000); // 15 second timeout

            return () => clearTimeout(timeout);
        }
    }, [loading, checkoutId]);

    useEffect(() => {
        if ((currentStepIndex === 8 || currentStepIndex === 9) && checkout?._id) {
            // Check if PDF already exists in checkout data
            if (checkout.pdfS3Url || checkout.pdfPath) {
                setPdfUrl(checkout.pdfS3Url || checkout.pdfPath);
            } else if (!pdfUrl && !generatingPDF) {
                generatePDFPreview();
            }

            // Initialize email config if not set
            // Robustly get username, handling potential structure variations
            const username = checkout.userId?.username || (typeof checkout.userId === 'object' ? (checkout.userId as any).username : '');

            if (!emailConfig.subject && username) {
                setEmailConfig((prev: any) => ({
                    ...prev,
                    subject: `Offboarding Completion Report: ${username}`,
                    body: `Dear HR Team,\n\nThis is to inform you that the offboarding process for ${username} has been successfully completed.\n\nAttached is the final checkout report.`
                }));
            }
        }
    }, [currentStepIndex, checkout?._id, checkout?.userId, checkout?.userId?.username, checkout?.pdfS3Url, checkout?.pdfPath]);

    const generatePDFPreview = async () => {
        if (!checkout?._id) return;
        setGeneratingPDF(true);
        try {
            const result = await checkoutService.generatePreviewPDF(checkout._id);
            
            // The result.pdfPath is now a full S3 URL, no need to prepend base URL
            if (result.pdfPath.startsWith('http')) {
                setPdfUrl(result.pdfPath);
            } else {
                // Fallback for backward compatibility
                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                const baseUrl = apiBaseUrl.replace('/api', '');
                setPdfUrl(`${baseUrl}${result.pdfPath}`);
            }
            
            if ((result as any).cached) {
            } else {
            }
        } catch (error: any) {
            console.error('Error generating PDF preview:', error);
            toast({
                title: 'Error',
                description: 'Failed to generate PDF preview',
                variant: 'destructive',
            });
        } finally {
            setGeneratingPDF(false);
        }
    };

    const fetchCheckoutDetails = async (preserveCurrentStep = false) => {
        if (!checkoutId) {
            return;
        }

        setLoading(true);

        try {
            const data = await checkoutService.getCheckoutDetails(checkoutId);
            
            // Add comprehensive null checks and data validation
            if (!data) {
                throw new Error('No data received from server');
            }
            
            if (!data.checkout) {
                throw new Error('No checkout data received from server');
            }

            // Ensure checkout has required properties
            const checkout = {
                ...data.checkout,
                status: data.checkout.status || 'Initiated',
                currentStep: data.checkout.currentStep || 1,
                steps: data.checkout.steps || []
            };

            if (!checkout.userId) {
                console.warn('Checkout data missing userId, attempting to refetch...');
                // Try to refetch after a short delay
                setTimeout(() => {
                    if (checkoutId) {
                        fetchCheckoutDetails(preserveCurrentStep);
                    }
                }, 2000);
                return;
            }

            setCheckout(checkout);
            setAssets(data.assets);

            // Adjust step index: if we have checkout, skip user selection (step 0)
            // Backend currentStep is 1-based (1=HR, 2=Email, 3=VPN, etc.)
            // Frontend currentStepIndex is 0-based (0=User, 1=HR, 2=Email, 3=VPN, etc.)
            // So frontend index = backend currentStep (since user selection is skipped when checkout exists)
            if (!preserveCurrentStep) {
                setCurrentStepIndex(checkout.currentStep || 1);
            }

            // Initialize states from existing data if any
            // Load data for all completed steps when checkout is completed
            if (checkout && checkout.status === 'Completed') {
                // Load data for all steps
                if (checkout.steps && Array.isArray(checkout.steps)) {
                    checkout.steps.forEach((step: any) => {
                        if (step && step.data) {
                            switch (step.stepIndex) {
                                case 1:
                                    setHrConfirmation(step.data);
                                    break;
                                case 2:
                                    setEmailRevocation(step.data);
                                    break;
                                case 3:
                                    setVpnAccess(step.data);
                                    break;
                                case 4:
                                    setAppAccess(step.data);
                                    break;
                                case 5:
                                    setDbAccess(step.data);
                                    break;
                                case 6:
                                    setBiometricAccess(step.data);
                                    break;
                                case 7:
                                    setReturnedAssets(step.data);
                                    break;
                                case 9:
                                    const username = checkout.userId?.username || 'Employee';
                                    setEmailConfig({
                                        to: step.data.to || [],
                                        cc: step.data.cc || [],
                                        subject: step.data.subject || `Offboarding Completion Report: ${username}`,
                                        body: step.data.body || `Dear HR Team,\n\nThis is to inform you that the offboarding process for ${username} has been successfully completed.\n\nAttached is the final checkout report.`
                                    });
                                    break;
                            }
                        }
                    });
                }
            } else if (checkout) {
                // Original logic for in-progress checkouts
                // Backend steps are 0-indexed in array, but currentStep is 1-indexed
                const currentStepData = checkout.steps && checkout.steps[checkout.currentStep - 1]?.data;
                if (checkout.currentStep === 1 && currentStepData) setHrConfirmation(currentStepData);
                if (checkout.currentStep === 2 && currentStepData) setEmailRevocation(currentStepData);
                if (checkout.currentStep === 3 && currentStepData) setVpnAccess(currentStepData);
                if (checkout.currentStep === 4 && currentStepData) setAppAccess(currentStepData);
                if (checkout.currentStep === 5 && currentStepData) setDbAccess(currentStepData);
                if (checkout.currentStep === 6 && currentStepData) setBiometricAccess(currentStepData);
                if (checkout.currentStep === 7 && currentStepData) setReturnedAssets(currentStepData);

                // Fix: Load saved email config if on Step 9
                if (checkout.currentStep === 9 && currentStepData) {
                    // Ensure defaults for body/subject if they were somehow saved as empty, and don't overwrite if we have better defaults
                    const username = checkout.userId?.username || 'Employee';
                    setEmailConfig({
                        to: currentStepData.to || [],
                        cc: currentStepData.cc || [],
                        subject: currentStepData.subject || `Offboarding Completion Report: ${username}`,
                        body: currentStepData.body || `Dear HR Team,\n\nThis is to inform you that the offboarding process for ${username} has been successfully completed.\n\nAttached is the final checkout report.`
                    });
                } else if (checkout.currentStep === 9) {
                    // On step 9 but no saved data? helper to set defaults
                    const username = checkout.userId?.username || 'Employee';
                    if (!emailConfig.subject) {
                        setEmailConfig((prev: any) => ({
                            ...prev,
                            subject: `Offboarding Completion Report: ${username}`,
                            body: `Dear HR Team,\n\nThis is to inform you that the offboarding process for ${username} has been successfully completed.\n\nAttached is the final checkout report.`
                        }));
                    }
                }
            }

            // Fetch asset checker data if on step 7
            const userId = getUserId(checkout.userId);
            if (checkout.currentStep === 7 && userId) {
                // Reset asset data first to ensure fresh fetch
                setAssetCheckerData(null);
                fetchAssetCheckerData(userId);
            }
        } catch (error: any) {
            console.error('Error fetching checkout details:', error);
            toast({
                title: 'Error',
                description: `Failed to fetch checkout details: ${error.message}`,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        // Step 0: User Selection - initiate checkout
        if (currentStepIndex === 0) {
            if (!selectedUserId) {
                toast({ title: 'Error', description: 'Please select a user', variant: 'destructive' });
                return;
            }
            setUpdating(true);
            try {
                const newCheckout = await checkoutService.initiateCheckout(selectedUserId);
                setCheckout(newCheckout);
                toast({
                    title: 'Success',
                    description: newCheckout.status === 'Initiated' && newCheckout.currentStep === 1
                        ? 'Checkout process initiated'
                        : 'Resuming existing checkout process',
                });
                // Move to the current step (Wizard step indices match backend step numbers 1-8)
                setCurrentStepIndex(newCheckout.currentStep || 1);
                // Fetch checkout details to get assets
                const data = await checkoutService.getCheckoutDetails(newCheckout._id);
                setCheckout(data.checkout);
                setAssets(data.assets);
            } catch (error: any) {
                toast({
                    title: 'Error',
                    description: error.response?.data?.message || 'Failed to initiate checkout',
                    variant: 'destructive',
                });
            } finally {
                setUpdating(false);
            }
            return;
        }

        // For other steps, we need checkout
        if (!checkout) return;

        setUpdating(true);
        try {
            let stepData = {};
            // currentStepIndex in wizard: 1=HR, 2=Email, 3=VPN, 4=App, 5=DB, 6=Biometric, 7=Asset, 8=Final
            // Backend expects: 1=HR, 2=Email, 3=VPN, 4=App, 5=DB, 6=Biometric, 7=Asset, 8=Final
            const stepIndex = currentStepIndex; // Already matches backend step numbering (1-8)

            if (stepIndex === 1) {
                // HR Confirmation - step 1, find by stepIndex
                const hrStep = checkout.steps?.find(s => s.stepIndex === 1);
                
                // Validate checkbox confirmations
                if (!hrConfirmation.relievingEmailReceived || !hrConfirmation.lastWorkingDayConfirmed || !hrConfirmation.documentationCompleted) {
                    toast({ title: 'Error', description: 'Please confirm all HR relieving confirmation requirements', variant: 'destructive' });
                    setUpdating(false);
                    return;
                }
                
                // Combine hrConfirmation data with any existing hrStep data
                stepData = {
                    ...hrConfirmation,
                    ...(hrStep?.data || {}),
                    ...(hrFile || {})
                };
            } else if (stepIndex === 2) {
                // Email Revocation - step 2, backend steps[1]
                if (!emailRevocation.loginBlocked) {
                    toast({ title: 'Error', description: 'Please confirm that login access is blocked', variant: 'destructive' });
                    setUpdating(false);
                    return;
                }
                stepData = emailRevocation;
            } else if (stepIndex === 3) {
                // VPN Access - step 3, backend steps[2]
                if (!vpnAccess.companyServers || !vpnAccess.databases || !vpnAccess.internalNetworks) {
                    toast({ title: 'Error', description: 'Please confirm all VPN access revocations', variant: 'destructive' });
                    setUpdating(false);
                    return;
                }
                stepData = vpnAccess;
            } else if (stepIndex === 4) {
                // Application Access - step 4, backend steps[3]
                const appKeys = Object.keys(appAccess).filter(key => key !== 'remark');
                const hasAnyAppChecked = appKeys.some(app => appAccess[app]);

                // Check if verification is completed
                if (!appAccess['User Account Verification']) {
                    toast({
                        title: 'Verification Required',
                        description: 'Please confirm that user account verification is complete',
                        variant: 'destructive'
                    });
                    setUpdating(false);
                    return;
                }

                // Check if at least one application access was revoked
                const applicationKeys = appKeys.filter(key => key !== 'User Account Verification');
                const hasApplicationsRevoked = applicationKeys.some(app => appAccess[app]);
                if (!hasApplicationsRevoked) {
                    toast({
                        title: 'Application Access Required',
                        description: 'Please select at least one application or system to revoke access from',
                        variant: 'destructive'
                    });
                    setUpdating(false);
                    return;
                }
                stepData = appAccess;
            } else if (stepIndex === 5) {
                // DB & Server Access - step 5, backend steps[4]
                if (!dbAccess.credentialRotation) {
                    toast({ title: 'Error', description: 'Mandatory: Confirm shared credential rotation', variant: 'destructive' });
                    setUpdating(false);
                    return;
                }
                stepData = dbAccess;
            } else if (stepIndex === 6) {
                // Biometric Access - step 6, backend steps[5]
                if (!biometricAccess.fingerprintRemoved || !biometricAccess.attendanceBlocked) {
                    toast({ title: 'Error', description: 'Please confirm both biometric removal actions', variant: 'destructive' });
                    setUpdating(false);
                    return;
                }
                stepData = biometricAccess;
            } else if (stepIndex === 7) {
                // Asset Verification - step 7, backend steps[6]
                // Validate all hardware and software assets are deleted
                if (assetCheckerData && (assetCheckerData.hardware.length > 0 || assetCheckerData.software.length > 0)) {
                    toast({
                        title: 'Error',
                        description: 'All hardware and software assets must be deleted before proceeding',
                        variant: 'destructive'
                    });
                    setUpdating(false);
                    return;
                }
                stepData = {};
            } else if (stepIndex === 8) {
                // Report Review
                stepData = { reviewCompleted: true, reviewedAt: new Date() };
            } else if (stepIndex === 9) {
                // Email Report
                if (emailConfig.to.length === 0) {
                    toast({ title: 'Error', description: 'Please select at least one recipient', variant: 'destructive' });
                    setUpdating(false);
                    return;
                }
                stepData = emailConfig;
            }

            const updatedCheckout = await checkoutService.updateStep(checkout._id, stepIndex, 'Completed', stepData);

            // Update the checkout state with the response from updateStep
            setCheckout(updatedCheckout);

            if (currentStepIndex < 9) {
                // Set currentStepIndex based on the updated checkout's currentStep

                // PROACTIVE FIX: If moving to Step 9 (Email), PRE-FILL the email config now
                if (updatedCheckout.currentStep === 9) {
                    const username = updatedCheckout.userId?.username ||
                        (typeof updatedCheckout.userId === 'object' ? (updatedCheckout.userId as any).username : '') ||
                        'Employee';

                    setEmailConfig((prev: any) => ({
                        ...prev,
                        subject: `Offboarding Completion Report: ${username}`,
                        body: `Dear HR Team,\n\nThis is to inform you that the offboarding process for ${username} has been successfully completed.\n\nAttached is the final checkout report.`
                    }));
                }

                setCurrentStepIndex(updatedCheckout.currentStep);

                // Show success message with next step info
                const nextStepTitle = steps[updatedCheckout.currentStep]?.title || 'Next Step';
                toast({
                    title: 'Step Completed',
                    description: `Moving to ${nextStepTitle}`,
                });

                // Also refresh assets data
                await fetchCheckoutDetails(true); // Preserve the current step we just set
            } else if (currentStepIndex === 9) {
                // Final proceed - allow re-completion for completed checkouts
                if (emailConfig.to.length === 0) {
                    toast({ title: 'Error', description: 'Please select at least one recipient', variant: 'destructive' });
                    setUpdating(false);
                    return;
                }

                const result = await checkoutService.proceedCheckout(checkout._id, emailConfig);
                
                if (checkout && checkout.status === 'Completed') {
                    toast({
                        title: 'Success',
                        description: `Offboarding updated and report resent to ${emailConfig.to.length} recipient(s).`
                    });
                } else {
                    toast({
                        title: 'Success',
                        description: `Offboarding completed and report sent to ${emailConfig.to.length} recipient(s).`
                    });
                }
                
                await fetchCheckoutDetails(false);
                // Navigate back after a short delay to show success message
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update step',
                variant: 'destructive',
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleResendEmail = async () => {
        if (!checkout?._id) return;
        if (emailConfig.to.length === 0) {
            toast({ title: 'Error', description: 'Please select at least one recipient', variant: 'destructive' });
            return;
        }

        setResendingEmail(true);
        try {
            await checkoutService.resendEmail(checkout._id, emailConfig);
            toast({
                title: 'Success',
                description: `Offboarding report resent to ${emailConfig.to.length} recipient(s).`
            });
            // Navigate back to checkout records after a short delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to resend email',
                variant: 'destructive',
            });
        } finally {
            setResendingEmail(false);
        }
    };

    if (loading && checkoutId) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-card border rounded-lg shadow-sm">
                    <div className="p-6 bg-muted/30 border-b">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <UserCheck className="w-6 h-6 text-primary" />
                                <h1 className="text-2xl font-bold">Offboarding Wizard</h1>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Loading checkout data...</span>
                                <span>Please wait</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center space-y-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Loading Checkout Data</h3>
                                <p className="text-sm text-muted-foreground">Fetching checkout details and user information...</p>
                                <p className="text-xs text-muted-foreground">Checkout ID: {checkoutId}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        fetchCheckoutDetails(false);
                                    }}
                                    className="mt-4"
                                >
                                    Retry Loading
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Calculate progress
    const totalStepsLabel = checkoutId ? steps.length - 1 : steps.length;
    const currentStepForProgress = checkoutId ? currentStepIndex : currentStepIndex + 1;
    const progress = (currentStepForProgress / totalStepsLabel) * 100;

    const isReadOnly = false; // Allow editing even when completed

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-card border rounded-lg shadow-sm">
                <div className="p-6 bg-muted/30 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-6 h-6 text-primary" />
                            <h1 className="text-2xl font-bold">
                                {checkout && checkout.userId ?
                                    `Offboarding Wizard: ${checkout.userId.username || checkout.userId.email || 'User'}` :
                                    checkoutId ? 'Offboarding Wizard: Loading...' : 'Offboarding Wizard'
                                }
                            </h1>
                        </div>
                        {checkout && checkout.userId && typeof checkout.userId !== 'string' && (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-normal tracking-wide">
                                    {checkout.userId.email}
                                </Badge>
                                {checkout && checkout.status === 'Completed' && (
                                    <Badge variant="default" className="text-xs font-normal tracking-wide bg-green-600 hover:bg-green-600">
                                        Completed - Editable
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Step {currentStepForProgress} of {totalStepsLabel}: {steps[currentStepIndex].title}</span>
                            <span>{Math.round(progress)}% Complete</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row min-h-[500px]">
                    {/* Mobile Step Indicator */}
                    <div className="lg:hidden p-4 border-b bg-muted/5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Step {currentStepForProgress} of {totalStepsLabel}</span>
                            <span className="text-muted-foreground">{steps[currentStepIndex].title}</span>
                        </div>
                    </div>

                    {/* Sidebar Steps */}
                    <div className="w-full lg:w-48 xl:w-56 border-r bg-muted/10 p-2 lg:p-3 overflow-y-auto">
                        <div className="space-y-1">
                            {steps.map((step, idx) => {
                                // Skip user selection step if checkout already exists
                                if (checkoutId && idx === 0) return null;

                                // For user selection step, check if user is selected
                                let isCompleted = false;
                                let canNavigate = false;

                                if (idx === 0) {
                                    isCompleted = !!checkout; // Completed if checkout exists
                                    canNavigate = true; // Can always navigate to user selection
                                } else {
                                    // For checkout steps (1-8), map to backend steps (0-7)
                                    // Wizard step idx → backend step (idx - 1) → backend currentStep idx
                                    // checkout.currentStep is 1-8, so we compare: (idx - 1) < (currentStep - 1)
                                    // Which simplifies to: idx < currentStep
                                    const backendStepNum = idx; // Wizard step 1 = backend step 1
                                    isCompleted = checkout ? (backendStepNum < (checkout.currentStep || 1) ||
                                        checkout.steps?.[backendStepNum - 1]?.status === 'Completed' ||
                                        (checkout.status && checkout.status === 'Completed')) : false;
                                    canNavigate = checkout ? ((checkout.status && checkout.status === 'Completed') || backendStepNum <= (checkout.currentStep || 1)) : false;
                                }

                                const isActive = idx === currentStepIndex;
                                const Icon = step.icon;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (canNavigate || idx === 0) {
                                                setCurrentStepIndex(idx);
                                            }
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs lg:text-sm transition-all duration-200",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : isCompleted
                                                    ? "text-muted-foreground hover:bg-muted/50 cursor-pointer"
                                                    : "text-muted-foreground/50 cursor-not-allowed"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                                            isActive ? "border-primary-foreground/30 bg-primary-foreground/10" :
                                                isCompleted ? "border-green-500 bg-green-50" : "border-muted"
                                        )}>
                                            {isCompleted ? <CheckCircle2 className="w-3 h-3 lg:w-4 lg:h-4" /> : <span className="text-[9px] lg:text-[10px]">{idx + 1}</span>}
                                        </div>
                                        <span className="truncate">{step.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 p-4 lg:p-6 xl:p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col items-center text-center space-y-2 mb-6">
                                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                                    {(() => {
                                        const Icon = steps[currentStepIndex].icon;
                                        return <Icon className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />;
                                    })()}
                                </div>
                                <h2 className="text-xl lg:text-2xl font-bold">{steps[currentStepIndex].title}</h2>
                                <p className="text-sm text-muted-foreground max-w-2xl">{getStepDescription(currentStepIndex)}</p>
                            </div>

                            <div className="bg-card border rounded-xl p-4 lg:p-6 shadow-sm">
                                {renderStepContent(
                                    currentStepIndex,
                                    {
                                        checkout,
                                        assets,
                                        appAccess,
                                        setAppAccess,
                                        dbAccess,
                                        setDbAccess,
                                        returnedAssets,
                                        setReturnedAssets,
                                        isReadOnly,
                                        users,
                                        loadingUsers,
                                        selectedUserId,
                                        setSelectedUserId,
                                        userDropdownOpen,
                                        setUserDropdownOpen,
                                        hrConfirmation,
                                        setHrConfirmation,
                                        emailRevocation,
                                        setEmailRevocation,
                                        vpnAccess,
                                        setVpnAccess,
                                        biometricAccess,
                                        setBiometricAccess,
                                        assetCheckerData,
                                        loadingAssets,
                                        getStatusBadgeClass,
                                        getExpiryStatus,
                                        handleDeleteAllocation,
                                        fetchAssetCheckerData,
                                        pdfUrl,
                                        generatingPDF,
                                        emailConfig,
                                        setEmailConfig,
                                        handleResendEmail,
                                        resendingEmail,
                                        showEmailConfig,
                                        setShowEmailConfig,
                                        checkoutId,
                                        fetchCheckoutDetails
                                    }
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 lg:p-6 border-t bg-muted/30 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (currentStepIndex === 8 && showEmailConfig) {
                                setShowEmailConfig(false);
                            } else {
                                setCurrentStepIndex(prev => Math.max(0, prev - 1));
                            }
                        }}
                        disabled={currentStepIndex === 0 || updating || resendingEmail}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <Button variant="outline" onClick={onClose} disabled={updating || resendingEmail}>
                            {currentStepIndex === 0 ? 'Cancel' : 'Save & Exit'}
                        </Button>
                        {checkout?.status === 'Completed' && currentStepIndex === 9 ? (
                            <Button
                                onClick={handleResendEmail}
                                disabled={resendingEmail}
                                className="px-8 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {resendingEmail ? 'Resending...' : 'Resend Report Email'}
                                <Mail className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleNext}
                                disabled={updating || (checkout?.steps?.[currentStepIndex - 1]?.status === 'Completed' && currentStepIndex === 9 && checkout?.status === 'Completed')}
                                className="px-8"
                            >
                                {updating ? 'Processing...' :
                                    (currentStepIndex === 0 ? 'Start Checkout' :
                                        checkout?.status === 'Completed' && currentStepIndex === 9 ? 'Update & Resend Report' :
                                            currentStepIndex === 9 ? 'Finalize Offboarding' : 'Complete & Next')}
                                {currentStepIndex !== 0 && <ChevronRight className="w-4 h-4 ml-2" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const getStepDescription = (index: number) => {
    const descriptions = [
        'Select the employee you want to initiate the checkout process for.',
        'Confirm HR relieving email, last working day, and complete documentation.',
        'Block login and deactivate the official email account.',
        'Revoke OpenVPN and internal network access.',
        'Revoke access to applications and verify complete user deactivation.',
        'Disable database users and rotate shared credentials.',
        'Remove fingerprint and face ID from attendance systems.',
        'Verify return of all allocated hardware and software assets.',
        'Complete final system validation and generate offboarding report.',
        'Send the final offboarding report to designated recipients.'
    ];
    return descriptions[index];
};

const renderStepContent = (index: number, props: any) => {
    const { checkout, assets, appAccess, setAppAccess, dbAccess, setDbAccess, returnedAssets, setReturnedAssets, isReadOnly, users, loadingUsers, selectedUserId, setSelectedUserId, userDropdownOpen, setUserDropdownOpen, hrConfirmation, setHrConfirmation, emailRevocation, setEmailRevocation, vpnAccess, setVpnAccess, biometricAccess, setBiometricAccess, assetCheckerData, loadingAssets, getStatusBadgeClass, getExpiryStatus, handleDeleteAllocation, fetchAssetCheckerData, pdfUrl, generatingPDF, emailConfig, setEmailConfig, handleResendEmail, resendingEmail, showEmailConfig, setShowEmailConfig, checkoutId, fetchCheckoutDetails } = props;

    // Safety check: skip rendering steps (except 0) if checkout is not loaded
    if (index > 0 && !checkout) {
        return <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            <p>Loading checkout data...</p>
        </div>;
    }

    switch (index) {
        case 0: { // Step 0: User Selection
            const selectedUser = users.find((u: any) => u._id === selectedUserId);
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                        <Users className="w-6 h-6 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold text-base">Employee Selection</p>
                            <p className="opacity-80">Select an employee from the secure directory to begin their offboarding process.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label>Select Employee</Label>
                        <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userDropdownOpen}
                                    className={cn(
                                        "w-full justify-between h-11 px-4 text-base font-normal",
                                        !selectedUserId && "text-muted-foreground",
                                        userDropdownOpen && "ring-2 ring-ring ring-offset-2"
                                    )}
                                    disabled={loadingUsers}
                                >
                                    <span className="truncate flex-1 text-left">
                                        {loadingUsers ? (
                                            "Loading users..."
                                        ) : selectedUserId && selectedUser ? (
                                            `${selectedUser.username} (${selectedUser.email})`
                                        ) : (
                                            "Select employee..."
                                        )}
                                    </span>
                                    <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] max-h-[500px] p-1" align="start">
                                <Command className="rounded-lg">
                                    <CommandInput
                                        placeholder="Search employees by name, email, or employee ID..."
                                        className="h-10 text-sm"
                                    />
                                    <CommandList className="max-h-[400px] overflow-y-auto">
                                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                            No employees found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {users.length > 0 && (
                                                <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                                                    {users.length} employee{users.length !== 1 ? 's' : ''} available
                                                </div>
                                            )}
                                            {users.map((user: any) => (
                                                <CommandItem
                                                    key={user._id}
                                                    value={`${user.username} ${user.email}`}
                                                    onSelect={() => {
                                                        setSelectedUserId(user._id);
                                                        setUserDropdownOpen(false);
                                                    }}
                                                    className="px-3 py-3 cursor-pointer rounded-md hover:bg-accent"
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-3 h-4 w-4 shrink-0",
                                                            selectedUserId === user._id ? "opacity-100 text-primary" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col flex-1 gap-1 min-w-0">
                                                        <span className="font-semibold text-sm leading-tight">{user.username}</span>
                                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                            <span className="break-all">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {selectedUserId && selectedUser && (
                            <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-2xl shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <UserCheck className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <p className="text-base font-bold text-blue-900">
                                        Selected Employee Details
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1 p-3 bg-white rounded-xl border border-blue-100/50">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Full Name</span>
                                        <p className="font-semibold text-gray-900">{selectedUser.username}</p>
                                    </div>
                                    <div className="space-y-1 p-3 bg-white rounded-xl border border-blue-100/50">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Email Address</span>
                                        <p className="font-semibold text-gray-900 truncate">{selectedUser.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        case 1: // Step 1: HR Confirmation
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                        <Upload className="w-6 h-6 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold text-base">HR Relieving Confirmation</p>
                            <p className="opacity-80">Receive and confirm official HR relieving documentation and communication.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="relieving-email-received"
                                checked={hrConfirmation.relievingEmailReceived}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setHrConfirmation({ ...hrConfirmation, relievingEmailReceived: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="relieving-email-received" className="font-semibold cursor-pointer">
                                    Official relieving email received from HR
                                </Label>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="last-working-day-confirmed"
                                checked={hrConfirmation.lastWorkingDayConfirmed}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setHrConfirmation({ ...hrConfirmation, lastWorkingDayConfirmed: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="last-working-day-confirmed" className="font-semibold cursor-pointer">
                                    Last working day confirmed
                                </Label>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="documentation-completed"
                                checked={hrConfirmation.documentationCompleted}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setHrConfirmation({ ...hrConfirmation, documentationCompleted: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="documentation-completed" className="font-semibold cursor-pointer">
                                    HR documentation completed and filed
                                </Label>
                            </div>
                        </div>
                    </div>
                    <CheckoutStepAttachment
                        checkoutId={checkout._id}
                        stepIndex={1}
                        existingAttachment={checkout.steps?.find(s => s.stepIndex === 1)?.attachment}
                        onUploadComplete={() => fetchCheckoutDetails(true)}
                        isReadOnly={isReadOnly}
                    />
                    <div className="space-y-2">
                        <Label htmlFor="hr-remark">Remarks (Optional)</Label>
                        <Textarea
                            id="hr-remark"
                            placeholder="Add any additional notes regarding HR confirmation, last working day details, or special instructions..."
                            value={hrConfirmation.remark || ''}
                            onChange={(e) => setHrConfirmation({ ...hrConfirmation, remark: e.target.value })}
                            disabled={isReadOnly}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>
            );

        case 2: // Step 2: Email Revocation
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                        <Mail className="w-6 h-6 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold text-base">Official Email Revocation</p>
                            <p className="opacity-80">Disable the employee's official email ID under the @qrsolutions.in domain.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <span className="text-sm font-medium">Official Email Status</span>
                            <Badge variant={checkout.userId?.emailStatus === 'Active' ? 'default' : 'secondary'}>
                                {checkout.userId?.emailStatus || 'Active'}
                            </Badge>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                                <Checkbox
                                    id="login-blocked"
                                    checked={emailRevocation.loginBlocked}
                                    disabled={isReadOnly}
                                    onCheckedChange={(checked) => setEmailRevocation({ ...emailRevocation, loginBlocked: !!checked })}
                                />
                                <div className="grid gap-1.5 leading-none flex-1">
                                    <Label htmlFor="login-blocked" className="font-semibold cursor-pointer">
                                        Login access is blocked
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Email: {checkout.userId?.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                                <Checkbox
                                    id="password-reset"
                                    checked={emailRevocation.passwordReset}
                                    disabled={isReadOnly}
                                    onCheckedChange={(checked) => setEmailRevocation({ ...emailRevocation, passwordReset: !!checked })}
                                />
                                <div className="grid gap-1.5 leading-none flex-1">
                                    <Label htmlFor="password-reset" className="font-semibold cursor-pointer">
                                        Password is reset (if required)
                                    </Label>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                                <Checkbox
                                    id="email-forwarding"
                                    checked={emailRevocation.emailForwarding}
                                    disabled={isReadOnly}
                                    onCheckedChange={(checked) => setEmailRevocation({ ...emailRevocation, emailForwarding: !!checked })}
                                />
                                <div className="grid gap-1.5 leading-none flex-1">
                                    <Label htmlFor="email-forwarding" className="font-semibold cursor-pointer">
                                        Configure email forwarding if instructed by HR or the Team Lead.
                                    </Label>
                                </div>
                            </div>
                        </div>
                        <CheckoutStepAttachment
                            checkoutId={checkout._id}
                            stepIndex={2}
                            existingAttachment={checkout.steps?.find(s => s.stepIndex === 2)?.attachment}
                            onUploadComplete={() => fetchCheckoutDetails(true)}
                            isReadOnly={isReadOnly}
                        />
                        <div className="space-y-2">
                            <Label htmlFor="email-remark">Remarks (Optional)</Label>
                            <Textarea
                                id="email-remark"
                                placeholder="Add any additional notes or instructions regarding email revocation..."
                                value={emailRevocation.remark || ''}
                                onChange={(e) => setEmailRevocation({ ...emailRevocation, remark: e.target.value })}
                                disabled={isReadOnly}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                </div>
            );

        case 4: // Step 4: Application Access
            const appKeys = Object.keys(appAccess).filter(key => key !== 'remark');
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                        <AppWindow className="w-6 h-6 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold text-base">Revoke Application Access</p>
                            <p className="opacity-80">Deactivate the user from all core and additional business applications.</p>
                        </div>
                    </div>
                    <div className="space-y-4">

                        <div className="space-y-4">
                            <Label className="text-sm font-medium">Core Applications</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {['TimeDoctor', '3CX', 'Bitbucket'].map((app) => (
                                    <div key={app} className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                                        <Checkbox
                                            id={`app-${app}`}
                                            checked={appAccess[app]}
                                            disabled={isReadOnly}
                                            onCheckedChange={(checked) => setAppAccess({ ...appAccess, [app]: !!checked })}
                                        />
                                        <Label htmlFor={`app-${app}`} className="cursor-pointer flex-1 font-medium">{app}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-medium">Additional Systems</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {['Other Internal Tools', 'Third-Party Applications'].map((app) => (
                                    <div key={app} className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                                        <Checkbox
                                            id={`app-${app}`}
                                            checked={appAccess[app]}
                                            disabled={isReadOnly}
                                            onCheckedChange={(checked) => setAppAccess({ ...appAccess, [app]: !!checked })}
                                        />
                                        <Label htmlFor={`app-${app}`} className="cursor-pointer flex-1 font-medium">{app}</Label>
                                        <span className="text-xs text-muted-foreground">
                                            {app === 'Other Internal Tools' ? 'Company-specific systems' : 'External services & platforms'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-medium">Verification</Label>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center space-x-3 p-4 border rounded-xl bg-primary/5 border-primary/20">
                                    <Checkbox
                                        id="app-User Account Verification"
                                        checked={appAccess['User Account Verification']}
                                        disabled={isReadOnly}
                                        onCheckedChange={(checked) => setAppAccess({ ...appAccess, 'User Account Verification': !!checked })}
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor="app-User Account Verification" className="cursor-pointer font-medium text-primary">
                                            User Account Verification Complete
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Confirm that the user has been fully removed or deactivated from all systems
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <CheckoutStepAttachment
                            checkoutId={checkout._id}
                            stepIndex={4}
                            existingAttachment={checkout.steps?.find(s => s.stepIndex === 4)?.attachment}
                            onUploadComplete={() => fetchCheckoutDetails(true)}
                            isReadOnly={isReadOnly}
                        />
                        <div className="space-y-2">
                            <Label htmlFor="app-remark">Additional Notes (Optional)</Label>
                            <Textarea
                                id="app-remark"
                                placeholder="Document any specific applications removed, issues encountered, or additional steps taken..."
                                value={appAccess.remark || ''}
                                onChange={(e) => setAppAccess({ ...appAccess, remark: e.target.value })}
                                disabled={isReadOnly}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                </div>
            );

        case 5: // Step 5: DB & Server Access
            return (
                <div className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="db-users"
                                checked={dbAccess.dbUsers}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setDbAccess({ ...dbAccess, dbUsers: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="db-users" className="font-semibold">Disable Database Users</Label>
                                <p className="text-xs text-muted-foreground">Remove all granted permissions for this user.</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="ssh-access"
                                checked={dbAccess.sshAccess}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setDbAccess({ ...dbAccess, sshAccess: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="ssh-access" className="font-semibold">Disable SSH Access</Label>
                                <p className="text-xs text-muted-foreground">Remove public keys from all production and staging servers.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col gap-4">
                            <div className="flex gap-3 text-blue-800">
                                <Shield className="w-5 h-5 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-bold uppercase tracking-tight">Security Verification</p>
                                    <p className="text-xs">Rotation of shared credentials is mandatory for offboarding compliance.</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="rotation"
                                    className="border-blue-400 data-[state=checked]:bg-blue-600"
                                    checked={dbAccess.credentialRotation}
                                    disabled={isReadOnly}
                                    onCheckedChange={(checked) => setDbAccess({ ...dbAccess, credentialRotation: !!checked })}
                                />
                                <Label htmlFor="rotation" className="text-sm font-medium text-blue-900 cursor-pointer">I confirm that all shared credentials have been rotated</Label>
                            </div>
                        </div>
                        <CheckoutStepAttachment
                            checkoutId={checkout._id}
                            stepIndex={5}
                            existingAttachment={checkout.steps?.find(s => s.stepIndex === 5)?.attachment}
                            onUploadComplete={() => fetchCheckoutDetails(true)}
                            isReadOnly={isReadOnly}
                        />
                        <div className="space-y-2">
                            <Label htmlFor="db-remark">Remarks (Optional)</Label>
                            <Textarea
                                id="db-remark"
                                placeholder="Add any additional notes or instructions regarding database and server access revocation..."
                                value={dbAccess.remark || ''}
                                onChange={(e) => setDbAccess({ ...dbAccess, remark: e.target.value })}
                                disabled={isReadOnly}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                </div>
            );

        case 7: // Step 7: Asset Verification
            // Show loading spinner if assets are currently being fetched
            if (loadingAssets) {
                return (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                            <p className="text-sm text-muted-foreground">Loading asset data...</p>
                            <p className="text-xs text-muted-foreground">User: {checkout?.userId?.username || 'Unknown'}</p>
                        </div>
                    </div>
                );
            }

            // If checkout data is not loaded yet, show loading
            const currentUserId = getUserId(checkout?.userId);
            if (!checkout || !currentUserId) {
                return (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                            <p className="text-sm text-muted-foreground">Loading checkout data...</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (checkoutId) {
                                        fetchCheckoutDetails(false);
                                    }
                                }}
                                className="mt-4"
                            >
                                Retry Loading
                            </Button>
                        </div>
                    </div>
                );
            }

            // If asset data is not loaded yet (but not currently loading), show loading with retry option
            if (!assetCheckerData) {
                return (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-sm">
                            <Laptop className="w-5 h-5 flex-shrink-0" />
                            <div className="space-y-2">
                                <p className="font-semibold">Loading Asset Data</p>
                                <p className="text-xs">Fetching allocated hardware and software assets for verification...</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-4">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                                <p className="text-sm text-muted-foreground">Loading asset data...</p>
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">User: {checkout?.userId?.username || 'Loading...'}</p>
                                    <p className="text-xs text-muted-foreground">User ID: {currentUserId}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (currentUserId) {
                                                fetchAssetCheckerData(currentUserId);
                                            }
                                        }}
                                        disabled={loadingAssets}
                                    >
                                        {loadingAssets ? 'Loading...' : 'Retry Loading Assets'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            // Now we know assetCheckerData exists, check if it has assets
            const hasNoAssets = assetCheckerData.hardware.length === 0 && assetCheckerData.software.length === 0;

            if (hasNoAssets) {
                return (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-sm">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            <div className="space-y-2">
                                <p className="font-semibold">No Assets Allocated</p>
                                <p className="text-xs">This user has no hardware or software assets allocated. Asset verification step can be completed.</p>
                            </div>
                        </div>
                        <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <CheckCircle2 className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-blue-800">Asset Verification Complete</h3>
                                <p className="text-sm text-muted-foreground">No company assets were allocated to this user.</p>
                                <p className="text-xs text-muted-foreground">You can proceed to the next step.</p>
                            </div>
                        </div>
                        <CheckoutStepAttachment
                            checkoutId={checkout._id}
                            stepIndex={7}
                            existingAttachment={checkout.steps?.find(s => s.stepIndex === 7)?.attachment}
                            onUploadComplete={() => fetchCheckoutDetails(true)}
                            isReadOnly={isReadOnly}
                        />
                    </div>
                );
            }

            return (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-sm">
                        <Laptop className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <p className="font-semibold">Verify Asset Return</p>
                            <p className="text-xs">All hardware and software assets must be deleted/returned before proceeding to the next step.</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="text-center">
                                <div className="font-semibold">{assetCheckerData.hardware.length}</div>
                                <div className="text-blue-600">Hardware</div>
                            </div>
                            <div className="text-center">
                                <div className="font-semibold">{assetCheckerData.software.length}</div>
                                <div className="text-blue-600">Software</div>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const currentUserId = getUserId(checkout?.userId);
                                            if (currentUserId) {
                                                fetchAssetCheckerData(currentUserId);
                                            }
                                        }}
                                        disabled={loadingAssets}
                                        className="ml-2"
                                    >
                                        {loadingAssets ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Refresh asset data</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <Tabs defaultValue="hardware" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="hardware" className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4" />
                                Hardware Assets ({assetCheckerData.hardware.length})
                            </TabsTrigger>
                            <TabsTrigger value="software" className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Software Assets ({assetCheckerData.software.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="hardware" className="mt-4">
                            {assetCheckerData.hardware.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No hardware assets assigned
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">S.No</TableHead>
                                                <TableHead>Asset Name</TableHead>
                                                <TableHead>Brand & Model</TableHead>
                                                <TableHead>Serial Number</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Assigned Date</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {assetCheckerData.hardware.map((allocation: any, index: number) => (
                                                <TableRow key={allocation._id}>
                                                    <TableCell className="text-center font-medium text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {allocation.hardwareAssetId.assetName || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation.hardwareAssetId.brand || '-'} {allocation.hardwareAssetId.assetModel || ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation.hardwareAssetId.serialNumber || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusBadgeClass(allocation.status)}>
                                                            {allocation.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(allocation.allocatedDate), 'MMM dd, yyyy')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => handleDeleteAllocation(e, 'hardware', allocation._id)}
                                                            title="Delete Allocation"
                                                            disabled={isReadOnly}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="software" className="mt-4">
                            {assetCheckerData.software.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No software assets assigned
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">S.No</TableHead>
                                                <TableHead>Software Name</TableHead>
                                                <TableHead>Vendor</TableHead>
                                                <TableHead>License Count</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Assigned Date</TableHead>
                                                <TableHead>Expiry Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {assetCheckerData.software.map((allocation: any, index: number) => (
                                                <TableRow key={allocation._id}>
                                                    <TableCell className="text-center font-medium text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {allocation.softwareAssetId.softwareName || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation.softwareAssetId.vendor || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation.licenseCount}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusBadgeClass(allocation.status)}>
                                                            {allocation.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(allocation.allocatedDate), 'MMM dd, yyyy')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation.expiryDate ? (
                                                            (() => {
                                                                const expiryStatus = getExpiryStatus(allocation.expiryDate, allocation.status);
                                                                return (
                                                                    <div className={`flex items-center gap-1 text-sm p-2 rounded ${expiryStatus?.bgColor || ''}`}>
                                                                        <Calendar className={`h-3 w-3 ${expiryStatus?.color || ''}`} />
                                                                        <span className={expiryStatus?.color || ''}>
                                                                            {format(new Date(allocation.expiryDate), 'MMM dd, yyyy')}
                                                                        </span>
                                                                        {expiryStatus?.status === 'expired' && (
                                                                            <span className="text-xs font-medium text-red-600 ml-1">(EXPIRED)</span>
                                                                        )}
                                                                        {expiryStatus?.status === 'expiring-soon' && (
                                                                            <span className="text-xs font-medium text-orange-600 ml-1">(EXPIRES SOON)</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => handleDeleteAllocation(e, 'software', allocation._id)}
                                                            title="Delete Allocation"
                                                            disabled={isReadOnly}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                    <CheckoutStepAttachment
                        checkoutId={checkout._id}
                        stepIndex={7}
                        existingAttachment={checkout.steps?.find(s => s.stepIndex === 7)?.attachment}
                        onUploadComplete={() => fetchCheckoutDetails(true)}
                        isReadOnly={isReadOnly}
                    />
                </div>
            );

        case 8: { // Step 8: Final Review & Validation
            return (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />

                        <div className="relative flex items-center justify-between gap-6">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-blue-200 transform transition-transform group-hover:rotate-3">
                                    <FileText className="w-7 h-7 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-gray-900">Final Review & Validation</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
                                        Please conduct a thorough review of the generated offboarding report.
                                        Verify all system deactivations and asset returns before finalizing the process.
                                    </p>
                                </div>
                            </div>
                            <div className="hidden md:block flex-shrink-0 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-sm">
                                <img
                                    src="https://qrsolutions.in/wp-content/uploads/2025/11/cropped-png-01-1-96x59-1.png"
                                    alt="QR Solutions Logo"
                                    className="h-10 w-auto object-contain"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Completion Status Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Email Revocation', icon: Mail, color: 'emerald' },
                            { label: 'VPN & Network', icon: Shield, color: 'emerald' },
                            { label: 'Asset Return', icon: Laptop, color: 'emerald' },
                            { label: 'Biometric Access', icon: Fingerprint, color: 'emerald' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 group">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-sm font-bold text-emerald-900">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* PDF Preview Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <div className="w-2 h-6 bg-blue-600 rounded-full" />
                                Generated Report
                            </h4>
                            {generatingPDF && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold animate-pulse">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Synchronizing Data...
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-100/30">
                            {pdfUrl ? (
                                <div className="bg-white rounded-xl border-2 border-white shadow-2xl overflow-hidden" style={{ height: '650px' }}>
                                    <iframe
                                        src={pdfUrl}
                                        className="w-full h-full"
                                        title="Checkout Report PDF"
                                    />
                                </div>
                            ) : generatingPDF ? (
                                <div className="flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-200" style={{ height: '400px' }}>
                                    <div className="relative mb-6">
                                        <div className="w-20 h-20 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
                                        <FileText className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <h5 className="text-lg font-bold text-gray-900">Generating Document</h5>
                                    <p className="mt-1 text-sm text-gray-500">Compiling all clearance records into a secure PDF...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-200" style={{ height: '400px' }}>
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <p className="text-lg font-bold text-gray-800">Preview Unavailable</p>
                                    <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">There was an issue loading the PDF preview. You can try refreshing the data.</p>
                                    <Button
                                        variant="outline"
                                        className="rounded-xl px-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                                        onClick={() => fetchCheckoutDetails && fetchCheckoutDetails(true)}
                                    >
                                        Regenerate Preview
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        case 9: { // Step 9: Email Report & Confirmation
            const handleAddEmail = (field: 'to' | 'cc', email: string) => {
                if (!emailConfig[field].includes(email)) {
                    setEmailConfig({ ...emailConfig, [field]: [...emailConfig[field], email] });
                }
            };

            const handleRemoveEmail = (field: 'to' | 'cc', email: string) => {
                setEmailConfig({
                    ...emailConfig,
                    [field]: emailConfig[field].filter((e: string) => e !== email)
                });
            };

            return (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />

                        <div className="relative flex items-center justify-between gap-6">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-blue-200 transform transition-transform group-hover:-rotate-3">
                                    <Mail className="w-7 h-7 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-gray-900">Email Report & Confirmation</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
                                        Configure the final report recipients. The system will automatically attach the
                                        official clearance PDF and notify all necessary departments.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Email Form Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-600" />
                            <h4 className="font-bold text-gray-900">Email Configuration</h4>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* TO Field */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold text-gray-700">Recipients (To) <span className="text-red-500">*</span></Label>
                                    <span className="text-[10px] uppercase tracking-widest text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Required</span>
                                </div>
                                <div className="min-h-[48px] p-2 border rounded-xl bg-gray-50/50 flex flex-wrap gap-2">
                                    {emailConfig.to.length === 0 ? (
                                        <span className="text-sm text-gray-400 py-1.5 px-3">No recipients selected...</span>
                                    ) : (
                                        emailConfig.to.map((email: string) => (
                                            <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1 gap-2 bg-white border-gray-200 text-blue-900 shadow-sm rounded-lg hover:border-blue-300 transition-colors">
                                                {email}
                                                <button
                                                    onClick={() => handleRemoveEmail('to', email)}
                                                    className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))
                                    )}
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-12 rounded-xl border-gray-300 hover:border-blue-400 hover:bg-blue-50/10 transition-all font-medium">
                                            Add Recipient...
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 shadow-2xl border-2 border-gray-100 rounded-xl overflow-hidden" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search users by name or email..." className="h-12 border-none focus:ring-0" />
                                            <CommandList className="max-h-[300px]">
                                                <CommandEmpty className="py-6 text-sm text-muted-foreground">No matching users found.</CommandEmpty>
                                                <CommandGroup>
                                                    {users.map((user: any) => (
                                                        <CommandItem
                                                            key={user._id}
                                                            onSelect={() => handleAddEmail('to', user.email)}
                                                            className="flex items-center gap-3 p-3 cursor-pointer aria-selected:bg-blue-50"
                                                        >
                                                            <div className={cn(
                                                                "w-4 h-4 border-2 rounded flex items-center justify-center transition-colors",
                                                                emailConfig.to.includes(user.email) ? "bg-blue-600 border-blue-600" : "border-gray-300"
                                                            )}>
                                                                {emailConfig.to.includes(user.email) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="flex flex-col flex-1">
                                                                <span className="font-bold text-sm text-gray-900">{user.username}</span>
                                                                <span className="text-xs text-gray-500">{user.email}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* CC Field */}
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-gray-700">Carbon Copy (CC)</Label>
                                <div className="min-h-[48px] p-2 border rounded-xl bg-gray-50/50 flex flex-wrap gap-2">
                                    {emailConfig.cc.length === 0 ? (
                                        <span className="text-sm text-gray-400 py-1.5 px-3">No CC recipients...</span>
                                    ) : (
                                        emailConfig.cc.map((email: string) => (
                                            <Badge key={email} variant="outline" className="pl-3 pr-1 py-1 gap-2 bg-white border-gray-200 text-gray-700 shadow-sm rounded-lg hover:border-gray-300 transition-colors">
                                                {email}
                                                <button
                                                    onClick={() => handleRemoveEmail('cc', email)}
                                                    className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))
                                    )}
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-12 rounded-xl border-gray-200 hover:border-gray-400 transition-all font-medium text-gray-500">
                                            Add CC Recipient...
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 shadow-2xl border-2 border-gray-100 rounded-xl overflow-hidden" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search users..." className="h-12 border-none focus:ring-0" />
                                            <CommandList className="max-h-[300px]">
                                                <CommandEmpty className="py-6 text-sm text-muted-foreground">No users found.</CommandEmpty>
                                                <CommandGroup>
                                                    {users.map((user: any) => (
                                                        <CommandItem
                                                            key={user._id}
                                                            onSelect={() => handleAddEmail('cc', user.email)}
                                                            className="flex items-center gap-3 p-3 cursor-pointer aria-selected:bg-blue-50"
                                                        >
                                                            <div className={cn(
                                                                "w-4 h-4 border-2 rounded flex items-center justify-center transition-colors",
                                                                emailConfig.cc.includes(user.email) ? "bg-blue-600 border-blue-600" : "border-gray-300"
                                                            )}>
                                                                {emailConfig.cc.includes(user.email) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="flex flex-col flex-1">
                                                                <span className="font-bold text-sm text-gray-900">{user.username}</span>
                                                                <span className="text-xs text-gray-500">{user.email}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-dashed my-4" />

                            {/* Subject & Body */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700">Email Subject</Label>
                                    <Input
                                        value={emailConfig.subject}
                                        onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })}
                                        placeholder="Enter email subject line..."
                                        className="h-12 rounded-xl focus-visible:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700">Message Content</Label>
                                    <Textarea
                                        value={emailConfig.body}
                                        onChange={(e) => setEmailConfig({ ...emailConfig, body: e.target.value })}
                                        className="min-h-[160px] rounded-xl focus-visible:ring-blue-500 resize-none p-4"
                                        placeholder="Compose your final offboarding message..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 border-t border-blue-100 flex items-center gap-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Shield className="w-3 h-3 text-blue-600" />
                            </div>
                            <p className="text-[11px] text-blue-800 leading-tight">
                                <span className="font-bold">Security Advisory:</span> Official offboarding is only considered final once the report has been successfully transmitted and logged by the server.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        case 3: // Step 3: VPN Access
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                        <Shield className="w-6 h-6 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold text-base">VPN Access Revocation</p>
                            <p className="opacity-80">Disable or remove the user from OpenVPN and all internal network tunnels.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="company-servers"
                                checked={vpnAccess.companyServers}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setVpnAccess({ ...vpnAccess, companyServers: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="company-servers" className="font-semibold cursor-pointer">
                                    Company servers
                                </Label>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="databases"
                                checked={vpnAccess.databases}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setVpnAccess({ ...vpnAccess, databases: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="databases" className="font-semibold cursor-pointer">
                                    Databases
                                </Label>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="internal-networks"
                                checked={vpnAccess.internalNetworks}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setVpnAccess({ ...vpnAccess, internalNetworks: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="internal-networks" className="font-semibold cursor-pointer">
                                    Internal networks
                                </Label>
                            </div>
                        </div>
                    </div>
                    <CheckoutStepAttachment
                        checkoutId={checkout._id}
                        stepIndex={3}
                        existingAttachment={checkout.steps?.find(s => s.stepIndex === 3)?.attachment}
                        onUploadComplete={() => fetchCheckoutDetails(true)}
                        isReadOnly={isReadOnly}
                    />
                    <div className="space-y-2">
                        <Label htmlFor="vpn-remark">Remarks (Optional)</Label>
                        <Textarea
                            id="vpn-remark"
                            placeholder="Add any additional notes or instructions regarding VPN access revocation..."
                            value={vpnAccess.remark || ''}
                            onChange={(e) => setVpnAccess({ ...vpnAccess, remark: e.target.value })}
                            disabled={isReadOnly}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>
            );

        case 6: // Step 6: Biometric Access
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                        <Fingerprint className="w-6 h-6 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold text-base">Biometric Access Removal</p>
                            <p className="opacity-80">Remove fingerprints from the attendance system and block further physical access.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="fingerprint-removed"
                                checked={biometricAccess.fingerprintRemoved}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setBiometricAccess({ ...biometricAccess, fingerprintRemoved: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="fingerprint-removed" className="font-semibold cursor-pointer">
                                    Fingerprint removed from attendance system
                                </Label>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/10">
                            <Checkbox
                                id="attendance-blocked"
                                checked={biometricAccess.attendanceBlocked}
                                disabled={isReadOnly}
                                onCheckedChange={(checked) => setBiometricAccess({ ...biometricAccess, attendanceBlocked: !!checked })}
                            />
                            <div className="grid gap-1.5 leading-none flex-1">
                                <Label htmlFor="attendance-blocked" className="font-semibold cursor-pointer">
                                    No further attendance entries can be recorded
                                </Label>
                            </div>
                        </div>
                    </div>
                    <CheckoutStepAttachment
                        checkoutId={checkout._id}
                        stepIndex={6}
                        existingAttachment={checkout.steps?.find(s => s.stepIndex === 6)?.attachment}
                        onUploadComplete={() => fetchCheckoutDetails(true)}
                        isReadOnly={isReadOnly}
                    />
                    <div className="space-y-2">
                        <Label htmlFor="biometric-remark">Remarks (Optional)</Label>
                        <Textarea
                            id="biometric-remark"
                            placeholder="Add any additional notes or instructions regarding biometric access removal..."
                            value={biometricAccess.remark || ''}
                            onChange={(e) => setBiometricAccess({ ...biometricAccess, remark: e.target.value })}
                            disabled={isReadOnly}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>
            );

        default: // Standard Checkbox Step
            return (
                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-8 w-full max-w-md">
                        <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-blue-200 animate-pulse">
                            <CheckCircle2 className="w-12 h-12 text-blue-400" />
                        </div>
                        <div className="flex flex-col items-center gap-4 p-8 border-2 border-blue-100 rounded-3xl bg-blue-50/30 text-center shadow-xl shadow-blue-50/50">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-blue-900">{steps[index].title} Verification</h3>
                                <p className="text-sm text-blue-700/70">Confirm that all necessary actions for this security step have been performed.</p>
                            </div>
                            <div className="flex items-center space-x-3 p-4 bg-white border border-blue-200 rounded-2xl w-full hover:border-blue-400 transition-colors cursor-pointer group" onClick={() => {
                                const checkbox = document.getElementById('generic-step') as HTMLInputElement;
                                if (checkbox) checkbox.click();
                            }}>
                                <Checkbox
                                    id="generic-step"
                                    className="h-5 w-5 border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    checked={checkout?.steps?.[index - 1]?.status === 'Completed'}
                                    disabled={isReadOnly}
                                />
                                <Label htmlFor="generic-step" className="font-bold text-blue-900 cursor-pointer">{steps[index].title} Verified</Label>
                            </div>
                        </div>
                    </div>
                </div>
            );
    }
};

export default CheckoutWizard;
