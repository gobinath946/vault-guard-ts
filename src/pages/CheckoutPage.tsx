import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Eye, CheckCircle2, Clock, AlertCircle, UserCheck, Search, RefreshCw } from 'lucide-react';
import { checkoutService, CheckoutProcess } from '@/services/checkoutService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/common/Pagination';
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
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
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
    }, [debouncedSearchQuery, statusFilter, currentPage, rowsPerPage]);

    const fetchCheckouts = async () => {
        setLoading(true);
        try {
            const response = await checkoutService.getCheckouts(
                currentPage,
                rowsPerPage,
                debouncedSearchQuery,
                statusFilter
            );

            // Handle different response formats
            if (response && typeof response === 'object' && 'checkouts' in response) {
                // New paginated format
                setCheckouts(Array.isArray(response.checkouts) ? response.checkouts : []);
                setPagination({
                    total: response.total || 0,
                    totalPages: response.totalPages || 1,
                });
            } else if (Array.isArray(response)) {
                // Old array format
                setCheckouts(response);
                setPagination({
                    total: response.length,
                    totalPages: 1,
                });
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
        setCurrentPage(1); // Reset to first page when searching
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1); // Reset to first page when filtering
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

    // Header component
    const header = (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left side: Search */}
            <div className="w-full sm:w-64">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by employee..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Right side: Refresh, Filter and Actions */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors border border-border/50"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw className="h-4 w-4" />
                </button>

                <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block"></div>

                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Initiated">Initiated</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                    </SelectContent>
                </Select>

                <div className="h-4 w-[1px] bg-border/60 mx-1 hidden lg:block"></div>

                <Button
                    onClick={handleInitiateCheckout}
                    size="sm"
                    className="h-9 gap-2 bg-[#4F46E5] hover:bg-[#4338CA] shadow-md"
                >
                    <UserCheck className="h-4 w-4" />
                    Initiate Checkout
                </Button>
            </div>
        </div>
    );

    // Footer component
    const footer = (
        <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
        />
    );

    return (
        <DashboardLayout
            title="Checkout Process"
            header={header}
            footer={footer}
            mainClassName="p-0 flex flex-col overflow-hidden"
        >
            <Card className="flex-1 flex flex-col border-0 shadow-none rounded-none w-full bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex-none px-6 py-4 border-b">
                    <CardTitle>Checkout Records</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 relative p-0 min-h-0 bg-background">
                    <div className="absolute inset-0 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                <TableRow className="border-b border-border bg-muted/50">
                                    <TableHead className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">S.No.</TableHead>
                                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Employee Name</TableHead>
                                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Initiated Date</TableHead>
                                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Current Step</TableHead>
                                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                                    <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Action</TableHead>
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
                                                {(currentPage - 1) * rowsPerPage + index + 1}
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
                </CardContent>
            </Card>
        </DashboardLayout>
    );
};

export default Checkout;
