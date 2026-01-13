import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Eye, CheckCircle2, Clock, AlertCircle, UserCheck, Search, Filter } from 'lucide-react';
import { checkoutService, CheckoutProcess } from '@/services/checkoutService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const Checkout = () => {
    const [checkouts, setCheckouts] = useState<CheckoutProcess[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
    });
    const navigate = useNavigate();

    const { toast } = useToast();

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchCheckouts();
    }, [debouncedSearchQuery, statusFilter, pagination.page]);

    const fetchCheckouts = async () => {
        setLoading(true);
        try {

            const response = await checkoutService.getCheckouts(
                pagination.page,
                pagination.limit,
                debouncedSearchQuery,
                statusFilter
            );

            // Handle different response formats
            if (response && typeof response === 'object' && 'checkouts' in response) {
                // New paginated format
                setCheckouts(Array.isArray(response.checkouts) ? response.checkouts : []);
                setPagination(prev => ({
                    ...prev,
                    total: response.total || 0,
                    totalPages: response.totalPages || 1,
                    hasNextPage: response.hasNextPage || false,
                    hasPrevPage: response.hasPrevPage || false,
                }));
            } else if (Array.isArray(response)) {
                // Old array format
                setCheckouts(response);
                setPagination(prev => ({
                    ...prev,
                    total: response.length,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                }));
            } else {
                console.warn('Unexpected response format:', response);
                setCheckouts([]);
            }
        } catch (error: any) {
            console.error('Fetch error:', error);
            toast({
                title: 'Error',
                description: `Failed to fetch checkout data: ${error.response?.data?.message || error.message}`,
                variant: 'destructive',
            });
            setCheckouts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleInitiateCheckout = () => {
        navigate('/checkout/wizard');
    };

    const handleResumeCheckout = (checkout: CheckoutProcess) => {
        navigate(`/checkout/wizard?checkoutId=${checkout._id}`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Completed':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
            case 'In Progress':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
            case 'Initiated':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Initiated</Badge>;
            case 'Failed':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout title="Checkout Process">
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Checkout Process</h1>
                        <p className="text-muted-foreground">Manage employee offboarding and access revocation</p>
                    </div>
                    <Button
                        onClick={handleInitiateCheckout}
                        className="w-full md:w-auto"
                    >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Initiate Checkout
                    </Button>
                </div>

                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Checkout Records</CardTitle>

                        {/* Filter and Search Controls */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search by employee name or email..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[80px]">S.No.</TableHead>
                                        <TableHead>Employee Name</TableHead>
                                        <TableHead>Initiated Date</TableHead>
                                        <TableHead>Current Step</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : checkouts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                {debouncedSearchQuery || statusFilter !== 'ALL'
                                                    ? 'No checkout records match your search criteria'
                                                    : 'No checkout records found'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        checkouts.map((checkout: any, index: number) => (
                                            <TableRow key={checkout._id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium text-muted-foreground">
                                                    {(pagination.page - 1) * pagination.limit + index + 1}
                                                </TableCell>
                                                <TableCell className="font-medium">{checkout.userId?.username}</TableCell>
                                                <TableCell>{new Date(checkout.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>Step {Math.min((checkout.currentStep !== undefined ? checkout.currentStep + 1 : 1), 10)} / 10</TableCell>
                                                <TableCell>{getStatusBadge(checkout.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    {checkout.status === 'In Progress' ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleResumeCheckout(checkout)}
                                                        >
                                                            Resume
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleResumeCheckout(checkout)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" /> View
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
                                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={!pagination.hasPrevPage}
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center space-x-1">
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={pagination.page === pageNum ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className="w-8 h-8 p-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={!pagination.hasNextPage}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Checkout;
