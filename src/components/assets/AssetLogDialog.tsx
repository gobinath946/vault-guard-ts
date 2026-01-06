import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { assetService } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { Search, X, Filter, Activity, Clock, User, CheckCircle2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AssetLog {
  _id: string;
  action: 'create' | 'update' | 'delete';
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedByName?: string;
  performedByEmail?: string;
  timestamp: string;
  details?: string;
  assetName?: string;
}

interface AssetLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: 'hardware' | 'software';
  assetId: string;
  assetName: string;
}

export const AssetLogDialog = ({
  isOpen,
  onClose,
  assetType,
  assetId,
  assetName,
}: AssetLogDialogProps) => {
  const [logs, setLogs] = useState<AssetLog[]>([]);
  const [allocationHistory, setAllocationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'activity' | 'history'>('activity');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '30days'>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && assetId) {
      fetchLogs();
      if (activeTab === 'history') {
        fetchAllocationHistory();
      }
    }
  }, [isOpen, assetId]);

  useEffect(() => {
    if (isOpen && assetId && activeTab === 'history') {
      fetchAllocationHistory();
    }
  }, [activeTab, isOpen, assetId]);

  const fetchLogs = async () => {
    if (!assetId) return;
    
    setLoading(true);
    try {
      const data = assetType === 'hardware'
        ? await assetService.getHardwareAssetLogs(assetId)
        : await assetService.getSoftwareAssetLogs(assetId);
      
      // Sort logs by timestamp (newest first)
      const sortedLogs = (data?.logs || []).sort((a: AssetLog, b: AssetLog) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setLogs(sortedLogs);
    } catch (error: any) {
      console.error('Error fetching asset logs:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch asset logs',
        variant: 'destructive',
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocationHistory = async () => {
    if (!assetId) return;
    
    setLoadingHistory(true);
    try {
      const data = assetType === 'hardware'
        ? await assetService.getHardwareAssetAllocationHistory(assetId)
        : await assetService.getSoftwareAssetAllocationHistory(assetId);
      
      // Sort by timestamp (newest first)
      const sortedHistory = (data?.logs || []).sort((a: any, b: any) => 
        new Date(b.timestamp || b.allocatedDate || 0).getTime() - new Date(a.timestamp || a.allocatedDate || 0).getTime()
      );
      
      setAllocationHistory(sortedHistory);
    } catch (error: any) {
      console.error('Error fetching allocation history:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch allocation history',
        variant: 'destructive',
      });
      setAllocationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Get unique fields from logs for field filter
  const availableFields = useMemo(() => {
    const fields = new Set<string>();
    logs.forEach(log => {
      if (log.field) {
        fields.add(log.field);
      }
    });
    return Array.from(fields).sort();
  }, [logs]);

  // Get friendly field names
  const getFriendlyFieldName = (field: string): string => {
    const friendlyFieldNames: { [key: string]: string } = {
      'assetName': 'Asset Name',
      'assetModel': 'Model',
      'assetType': 'Asset Type',
      'brand': 'Brand',
      'serialNumber': 'Serial Number',
      'purchaseDate': 'Purchase Date',
      'softwareName': 'Software Name',
      'vendor': 'Vendor',
      'totalLicenseCount': 'Total Licenses',
      'availableLicenseCount': 'Available Licenses',
      'startDate': 'Start Date',
      'endDate': 'End Date',
      'status': 'Status',
      'remarks': 'Remarks',
    };
    return friendlyFieldNames[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Filter logs based on all filters
  const filteredLogs = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    return logs.filter(log => {
      // Date range filter
      if (dateRange === '30days') {
        const logDate = new Date(log.timestamp);
        if (logDate < thirtyDaysAgo) {
          return false;
        }
      }

      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Field filter - when "all" is selected, show all logs (including create/delete without fields)
      if (fieldFilter !== 'all') {
        // If filtering by a specific field, only show logs with that field
        if (!log.field || log.field !== fieldFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = (
          log.action?.toLowerCase().includes(query) ||
          log.field?.toLowerCase().includes(query) ||
          log.oldValue?.toLowerCase().includes(query) ||
          log.newValue?.toLowerCase().includes(query) ||
          log.performedByName?.toLowerCase().includes(query) ||
          log.performedByEmail?.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query) ||
          log.assetName?.toLowerCase().includes(query)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, actionFilter, fieldFilter, searchQuery, dateRange]);

  // Group logs by timestamp to show multiple field changes together
  const groupedLogs = useMemo(() => {
    const groups = new Map<string, AssetLog[]>();
    
    filteredLogs.forEach(log => {
      // Use timestamp as key, but round to nearest minute for grouping
      const logDate = new Date(log.timestamp);
      const key = logDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(log);
    });
    
    // Convert to array and sort by timestamp (newest first)
    return Array.from(groups.entries())
      .map(([key, logs]) => ({
        timestamp: key,
        logs: logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredLogs]);

  // Get logs for Activity Log tab (create, update, delete with field changes, grouped)
  const activityLogs = useMemo(() => {
    return groupedLogs.map(group => ({
      ...group,
      logs: group.logs.filter(log => {
        // Include all actions (create, update, delete)
        if (log.action === 'create' || log.action === 'delete') {
          return true;
        }
        // For updates, include if there are field changes (field exists and values are defined, even if empty strings)
        if (log.action === 'update') {
          return log.field && (log.oldValue !== undefined || log.newValue !== undefined);
        }
        return false;
      })
    })).filter(group => group.logs.length > 0);
  }, [groupedLogs]);

  // Get logs for Device History tab (all logs in chronological order)
  const deviceHistoryLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [filteredLogs]);

  // Format value based on field type
  const formatValue = (value: string | undefined, fieldName: string): string => {
    if (!value || value === '(empty)') return value || '(empty)';
    
    // Format date fields
    if (fieldName === 'purchaseDate' || fieldName === 'startDate' || fieldName === 'endDate' || 
        fieldName === 'allocatedDate' || fieldName === 'returnedDate' || fieldName === 'expiryDate') {
      try {
        // Check if it's already a formatted date (not a timestamp)
        if (value.includes('T') || value.includes('Z') || value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // It's an ISO date or YYYY-MM-DD format, format it as dd/MM/yyyy
          return format(new Date(value), 'dd/MM/yyyy');
        } else if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          // It's already in "dd/MM/yyyy" format, return as-is
          return value;
        }
        return value; // Return as-is if not a recognizable date format
      } catch (error) {
        return value; // Return original value if date parsing fails
      }
    }
    
    return value;
  };

  // Format log details in a user-friendly way
  const formatLogDetails = (details: string): React.ReactNode => {
    if (!details) return null;
    
    try {
      // Check if details contain field changes
      if (details.includes('changed') || details.includes('updated')) {
        // Try to extract field changes from details
        const changeMatch = details.match(/(\w+) changed/);
        if (changeMatch) {
          const field = changeMatch[1];
          const displayField = getFriendlyFieldName(field);
          
          return (
            <div className="text-sm text-blue-600 italic p-3 bg-blue-50 rounded">
              ✨ {displayField} updated
            </div>
          );
        }
      }
      
      return <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">{details}</div>;
    } catch (error) {
      return <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">{details}</div>;
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setActionFilter('all');
    setFieldFilter('all');
    setSearchQuery('');
    setDateRange('all');
  };

  // Check if any filters are active
  const hasActiveFilters = actionFilter !== 'all' || fieldFilter !== 'all' || searchQuery !== '' || dateRange !== 'all';

  // Get badge variant based on action
  const getBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Format action name
  const formatAction = (action: string) => {
    return action.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">
                {assetType === 'hardware' ? 'Hardware' : 'Software'} Asset Management
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                {assetName || 'Asset'} • Complete activity and allocation history
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'activity' | 'history')}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Log
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                User History
              </TabsTrigger>
            </TabsList>

            {/* Filters - Right side of tabs */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-32 border-purple-200">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={dateRange === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(dateRange === '30days' ? 'all' : '30days')}
                className={dateRange === '30days' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Last 30 days
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {actionFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Action: {actionFilter}
                  <button
                    onClick={() => setActionFilter('all')}
                    className="ml-1 hover:bg-secondary rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {fieldFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Field: {getFriendlyFieldName(fieldFilter)}
                  <button
                    onClick={() => setFieldFilter('all')}
                    className="ml-1 hover:bg-secondary rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:bg-secondary rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {dateRange !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Last 30 days
                  <button
                    onClick={() => setDateRange('all')}
                    className="ml-1 hover:bg-secondary rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4 max-h-[50vh] overflow-y-auto pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <span className="ml-2">Loading asset logs...</span>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="space-y-4">
                  <p>
                    {hasActiveFilters 
                      ? 'No changes found matching the current filters' 
                      : 'No field changes found for this asset'}
                  </p>
                  {!hasActiveFilters && (
                    <div className="text-sm space-y-2">
                      <p>Field changes are logged when:</p>
                      <ul className="text-left max-w-md mx-auto space-y-1">
                        <li>• Asset fields are updated</li>
                        <li>• Status changes occur</li>
                        <li>• Any property is modified</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              activityLogs.map((group, groupIndex) => {
                const firstLog = group.logs[0];
                const timestamp = new Date(firstLog.timestamp);
                
                return (
                  <div key={`activity-group-${group.timestamp}-${groupIndex}`} className="border rounded-lg p-5 space-y-4 bg-white shadow-sm">
                    {/* Header with timestamp */}
                    <div className="flex items-center justify-between pb-3 border-b">
                      <span className="text-sm font-medium text-gray-700">
                        {format(timestamp, 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                      <Badge variant={getBadgeVariant(firstLog.action)}>
                        {formatAction(firstLog.action)}
                      </Badge>
                    </div>

                    {/* Content based on action type */}
                    {group.logs.length > 0 && (
                      <div className="space-y-3">
                        {firstLog.action === 'create' && (
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-semibold text-green-900 mb-2">Asset Created</h4>
                            {firstLog.details && (
                              <div className="text-sm text-green-700 mt-2">
                                {formatLogDetails(firstLog.details)}
                              </div>
                            )}
                          </div>
                        )}

                        {firstLog.action === 'delete' && (
                          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <h4 className="text-sm font-semibold text-red-900 mb-2">Asset Deleted</h4>
                            {firstLog.details && (
                              <div className="text-sm text-red-700 mt-2">
                                {formatLogDetails(firstLog.details)}
                              </div>
                            )}
                          </div>
                        )}

                        {firstLog.action === 'update' && (
                          <>
                            {/* Change Details - Show all field changes */}
                            {group.logs.some(log => log.field && (log.oldValue !== undefined || log.newValue !== undefined)) && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-900">• Change Details</h4>
                                <div className="space-y-2 pl-4">
                                  {group.logs.map((log, logIndex) => (
                                    log.field && (log.oldValue !== undefined || log.newValue !== undefined) && (
                                      <div key={`change-${log._id}-${logIndex}`} className="flex items-center gap-2 text-sm">
                                        <span className="font-medium text-gray-700 min-w-[120px]">
                                          {getFriendlyFieldName(log.field)}:
                                        </span>
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 line-through">
                                          {formatValue(log.oldValue, log.field)}
                                        </Badge>
                                        <span className="text-gray-400">→</span>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                          {formatValue(log.newValue, log.field)}
                                        </Badge>
                                      </div>
                                    )
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Performed by */}
                    <div className="text-xs text-muted-foreground pt-3 border-t">
                      <strong>Performed by:</strong> {firstLog.performedByName || 'System'} 
                      {firstLog.performedByEmail && ` (${firstLog.performedByEmail})`}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Asset History Tab - Shows allocation history with user details */}
          <TabsContent value="history" className="space-y-4 max-h-[50vh] overflow-y-auto pt-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <span className="ml-2">Loading allocation history...</span>
              </div>
            ) : allocationHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="space-y-4">
                  <p>No allocation history found for this asset</p>
                  <div className="text-sm space-y-2">
                    <p>This asset has not been allocated to any users yet.</p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
                      <h4 className="font-medium text-gray-900 mb-2">Asset Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Asset:</strong> {assetName}</p>
                        <p><strong>Asset ID:</strong> {assetId}</p>
                        <p><strong>Type:</strong> {assetType === 'hardware' ? 'Hardware Asset' : 'Software Asset'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              allocationHistory.map((allocation, index) => {
                const timestamp = allocation.timestamp || allocation.allocatedDate || allocation.returnedDate;
                const userName = allocation.allocatedToUserName || (allocation.userId as any)?.username || 'Unknown User';
                const userEmail = allocation.allocatedToUserEmail || (allocation.userId as any)?.email || '';
                const action = allocation.action || (allocation.returnedDate ? 'return' : 'allocate');
                const isCurrent = allocation.status === 'ACTIVE' && !allocation.returnedDate;
                const isOngoing = isCurrent;
                
                return (
                  <div 
                    key={`allocation-${allocation._id}-${timestamp}-${index}`} 
                    className={`border rounded-lg p-5 space-y-4 shadow-sm relative overflow-hidden ${
                      isCurrent 
                        ? 'ring-2 ring-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-300' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Current/Ongoing Indicator Badge */}
                    {isCurrent && (
                      <div className="absolute top-0 right-0 bg-purple-600 text-white px-3 py-1 rounded-bl-lg text-xs font-semibold flex items-center gap-1">
                        <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                        ONGOING
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          isCurrent 
                            ? 'bg-purple-100 ring-2 ring-purple-300 ring-offset-2' 
                            : 'bg-gray-100'
                        }`}>
                          {isCurrent ? (
                            <CheckCircle2 className="h-6 w-6 text-purple-600" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isCurrent ? 'text-purple-900' : 'text-gray-900'}`}>
                              {userName}
                            </span>
                            {isCurrent && (
                              <Badge className="bg-purple-600 text-white text-xs">Current</Badge>
                            )}
                          </div>
                          {userEmail && (
                            <div className={`text-sm ${isCurrent ? 'text-purple-700' : 'text-muted-foreground'}`}>
                              {userEmail}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm text-muted-foreground">
                          {timestamp ? format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss') : 'Unknown date'}
                        </span>
                      </div>
                    </div>

                    {/* Allocation Details */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {allocation.allocatedDate && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Allocated Date</div>
                            <div className="font-medium text-gray-900">
                              {format(new Date(allocation.allocatedDate), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        )}
                        {allocation.returnedDate && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Returned Date</div>
                            <div className="font-medium text-gray-900">
                              {format(new Date(allocation.returnedDate), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        )}
                        {allocation.expiryDate && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Expiry Date</div>
                            <div className="font-medium text-gray-900">
                              {format(new Date(allocation.expiryDate), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        )}
                        {allocation.status && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Status</div>
                            <Badge 
                              className={
                                isOngoing
                                  ? 'bg-green-500 text-white font-semibold animate-pulse'
                                  : allocation.status === 'ACTIVE' 
                                  ? 'bg-green-100 text-green-800' 
                                  : allocation.status === 'RETURNED'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {isOngoing ? 'ONGOING' : allocation.status}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {allocation.remarks && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Remarks</div>
                          <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                            {allocation.remarks}
                          </div>
                        </div>
                      )}

                      {allocation.allocatedDate && (
                        <div className="text-xs pt-2 border-t">
                          {isOngoing ? (
                            <div className="space-y-1">
                              <div className={`font-semibold ${isCurrent ? 'text-purple-700' : 'text-muted-foreground'}`}>
                                <strong>Duration:</strong> {Math.ceil(
                                  (new Date().getTime() - new Date(allocation.allocatedDate).getTime()) / (1000 * 60 * 60 * 24)
                                )} days (ongoing)
                              </div>
                              <div className="flex items-center gap-2 text-purple-600">
                                <div className="h-1.5 w-1.5 bg-purple-600 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium">Active allocation</span>
                              </div>
                            </div>
                          ) : allocation.returnedDate ? (
                            <div className="text-muted-foreground">
                              <strong>Duration:</strong> {Math.ceil(
                                (new Date(allocation.returnedDate).getTime() - new Date(allocation.allocatedDate).getTime()) / (1000 * 60 * 60 * 24)
                              )} days
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className={`text-xs pt-2 border-t ${isCurrent ? 'text-purple-700' : 'text-muted-foreground'}`}>
                        <strong>Action:</strong> {action === 'allocate' ? 'Allocated' : action === 'return' ? 'Returned' : action}
                        {allocation.performedByName && (
                          <span> • <strong>Performed by:</strong> {allocation.performedByName}
                            {allocation.performedByEmail && ` (${allocation.performedByEmail})`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
