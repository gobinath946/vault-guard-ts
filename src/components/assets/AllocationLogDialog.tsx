import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { assetService } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

interface AllocationLog {
  _id: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'return' | 'allocate' | 'revoke' | 'expired';
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedByName: string;
  performedByEmail: string;
  timestamp: string;
  details?: string;
  // Allocation specific fields
  allocatedToUserId?: string;
  allocatedToUserName?: string;
  allocatedToUserEmail?: string;
  allocatedDate?: string;
  returnedDate?: string;
  expiryDate?: string;
  licenseCount?: number;
  remarks?: string;
  // IDs for grouping
  hardwareAllocationId?: string;
  softwareAllocationId?: string;
  // For querying
  userId?: string;
  hardwareAssetId?: string;
  softwareAssetId?: string;
  assetName?: string;
  status?: string;
  // For distinguishing asset history logs
  isAssetHistory?: boolean;
}

interface AllocationLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allocationType: 'hardware' | 'software';
  allocationId?: string; // Optional - if viewing specific allocation
  allocationIds?: string[]; // Optional - if viewing multiple allocations (event mode)
  assetId?: string; // Optional - if viewing all allocations for an asset
  assetIds?: string[]; // Optional - if viewing multiple assets (event mode)
  userId?: string; // Optional - if viewing user's allocation history
  mode: 'allocation' | 'asset' | 'user' | 'event'; // View mode
  assetName?: string; // For display
  userName?: string; // For display
}

export const AllocationLogDialog = ({
  isOpen,
  onClose,
  allocationType,
  allocationId,
  allocationIds,
  assetId,
  assetIds,
  userId,
  mode,
  assetName,
  userName,
}: AllocationLogDialogProps) => {
  const [logs, setLogs] = useState<AllocationLog[]>([]);
  const [deviceGroups, setDeviceGroups] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalDevices: number; activeDevices: number; returnedDevices: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'user'>('timeline');
  const [effectiveUserId, setEffectiveUserId] = useState<string | undefined>(userId);
  const { toast } = useToast();

  useEffect(() => {
    setEffectiveUserId(userId);
  }, [userId]);

  const createLogKey = (log: AllocationLog): string => {
    const normalizedLog = {
      id: log._id || '',
      timestamp: log.timestamp || '',
      action: log.action || '',
      userId: log.allocatedToUserId || log.performedBy || '',
      assetId: log.hardwareAssetId || log.softwareAssetId || '',
      timestampRounded: log.timestamp ? new Date(log.timestamp).toISOString().slice(0, 19) : ''
    };
    return JSON.stringify(normalizedLog);
  };

  const formatLogDetails = (details: string): React.ReactNode => {
    if (!details) return null;
    try {
      if (details.includes('changed from')) {
        const changes = details.split(', ').map((change, index) => {
          if (change.includes('[object Object]') || change.includes('undefined') || change.includes('null')) return null;
          const match = change.match(/(\w+) changed from ['"]([^'"]*?)['"] to ['"]([^'"]*?)['"]/) ||
            change.match(/(\w+) changed from (\S+) to (\S+)/);

          if (match) {
            const [, field, oldVal, newVal] = match;
            const technicalFields = ['createdBy', 'updatedBy', '_id', '__v', 'companyId', 'performedBy', 'userId', 'id', 'objectId', 'mongoId', 'createdAt', 'updatedAt', 'version', 'rev', 'revision'];
            if (technicalFields.includes(field)) return null;

            if (oldVal.includes('[object Object]') || newVal.includes('[object Object]') ||
              oldVal.includes('undefined') || newVal.includes('undefined') ||
              /^[0-9a-f]{24}$/i.test(oldVal) || /^[0-9a-f]{24}$/i.test(newVal) ||
              oldVal === 'null' || newVal === 'null') return null;

            const userRelevantFields = ['assetName', 'assetModel', 'assetType', 'brand', 'serialNumber', 'purchaseDate', 'status', 'remarks', 'softwareName', 'vendor', 'totalLicenseCount', 'availableLicenseCount', 'startDate', 'endDate'];
            if (!userRelevantFields.includes(field)) return null;

            const friendlyFieldNames: { [key: string]: string } = {
              'serialNumber': 'Serial Number', 'assetName': 'Asset Name', 'assetModel': 'Model', 'assetType': 'Asset Type', 'brand': 'Brand', 'purchaseDate': 'Purchase Date',
              'softwareName': 'Software Name', 'totalLicenseCount': 'Total Licenses', 'availableLicenseCount': 'Available Licenses', 'startDate': 'Start Date', 'endDate': 'End Date',
              'status': 'Status', 'remarks': 'Remarks', 'vendor': 'Vendor', 'credentials': 'Credentials', 'licenseCount': 'License Count', 'expiryDate': 'Expiry Date', 'customFields': 'Software Configuration'
            };
            const displayField = friendlyFieldNames[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const formatDateValue = (value: string): string => {
              if (value && (value.includes('T') && value.includes('Z')) || value.match(/^\d{4}-\d{2}-\d{2}T/)) {
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                } catch (error) { }
              }
              return value;
            };
            const formattedOldVal = formatDateValue(oldVal);
            const formattedNewVal = formatDateValue(newVal);

            if (formattedOldVal === formattedNewVal || ((!formattedOldVal || formattedOldVal === '') && (!formattedNewVal || formattedNewVal === ''))) return null;

            return (
              <div key={`${field}-${index}`} className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded">
                <span className="font-medium text-blue-800 min-w-[100px]">{displayField}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-sm line-through">{formattedOldVal}</span>
                  <span className="text-blue-500 font-bold">→</span>
                  <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-sm font-medium">{formattedNewVal}</span>
                </div>
              </div>
            );
          }
          return null;
        }).filter(Boolean);

        return changes.length > 0 ? <div className="space-y-1">{changes}</div> : <div className="text-sm text-blue-600 italic p-3 bg-blue-50 rounded">✨ Asset updated successfully</div>;
      } else {
        if (details.includes('[object Object]') || details.includes('createdBy') || details.includes('updatedBy') || details.includes('undefined')) {
          return <div className="text-sm text-blue-600 italic p-3 bg-blue-50 rounded">✨ Asset updated successfully</div>;
        }
        return <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">{details}</div>;
      }
    } catch (error) {
      return <div className="text-sm text-blue-600 italic p-3 bg-blue-50 rounded">✨ Asset updated successfully</div>;
    }
  };

  const deduplicateLogs = (logs: AllocationLog[], context: string = ''): AllocationLog[] => {
    const seen = new Set<string>();
    return logs.filter(log => {
      const key = createLogKey(log);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  useEffect(() => {
    if (isOpen) fetchLogs();
  }, [isOpen, allocationId, allocationIds, assetId, assetIds, userId, mode, statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let data;
      if (mode === 'allocation' && allocationId) {
        data = allocationType === 'hardware'
          ? await assetService.getHardwareAllocationLogs(allocationId, statusFilter)
          : await assetService.getSoftwareAllocationLogs(allocationId, statusFilter);
      } else if (mode === 'event' && allocationIds && allocationIds.length > 0) {
        const allLogs: AllocationLog[] = [];
        for (const id of allocationIds) {
          try {
            const logData = allocationType === 'hardware'
              ? await assetService.getHardwareAllocationLogs(id, statusFilter)
              : await assetService.getSoftwareAllocationLogs(id, statusFilter);
            if (logData?.logs) allLogs.push(...logData.logs);
          } catch (error) { console.warn(`Failed to fetch logs for allocation ${id}:`, error); }
        }

        if (assetIds && assetIds.length > 0) {
          for (const assetId of assetIds) {
            try {
              const assetHistoryData = allocationType === 'hardware'
                ? await assetService.getHardwareAssetAllocationHistory(assetId, statusFilter)
                : await assetService.getSoftwareAssetAllocationHistory(assetId, statusFilter);
              if (assetHistoryData?.logs) {
                const assetLogs = assetHistoryData.logs.map(log => ({ ...log, isAssetHistory: true }));
                allLogs.push(...assetLogs);
              }
            } catch (error) { console.warn(`Failed to fetch asset history for asset ${assetId}:`, error); }
          }
        }

        const detectedUserId = userId || allLogs.find(l => l.allocatedToUserId)?.allocatedToUserId;
        if (detectedUserId && detectedUserId !== effectiveUserId) setEffectiveUserId(String(detectedUserId));

        if (detectedUserId && allocationType === 'hardware') {
          try {
            const userHistory = await assetService.getUserHardwareAllocationHistory(String(detectedUserId), statusFilter) as any;
            setDeviceGroups(userHistory.deviceGroups || []);
            setSummary(userHistory.summary || null);
          } catch (error) { console.warn(`Failed to fetch user history for event mode:`, error); }
        }

        const uniqueLogs = deduplicateLogs(allLogs, 'Event mode');
        uniqueLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        data = { logs: uniqueLogs };
      } else if (mode === 'asset' && assetId) {
        data = allocationType === 'hardware' ? await assetService.getHardwareAssetAllocationHistory(assetId, statusFilter) : await assetService.getSoftwareAssetAllocationHistory(assetId, statusFilter);
        if (data?.logs) {
          data.logs = deduplicateLogs(data.logs, 'Asset mode').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } else if (mode === 'user' && userId) {
        data = allocationType === 'hardware' ? await assetService.getUserHardwareAllocationHistory(userId, statusFilter) : await assetService.getUserSoftwareAllocationHistory(userId, statusFilter);
        if (allocationType === 'hardware' && data?.deviceGroups) {
          setDeviceGroups(data.deviceGroups || []);
          setSummary(data.summary || null);
        } else {
          setDeviceGroups([]);
          setSummary(null);
        }
        if (data?.logs) {
          data.logs = deduplicateLogs(data.logs, 'User mode').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } else {
        setLogs([]);
        return;
      }
      const finalLogs = deduplicateLogs(data?.logs || [], 'Final safety net');
      setLogs(finalLogs);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to fetch logs', variant: 'destructive', });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = (() => {
    // Only perform advanced deduplication to handle potential duplicates from different sources
    const uniqueLogs = logs.filter((log, index, array) => {
      const earlierIdentical = array.slice(0, index).find(earlierLog => {
        // Identical if same ID (if present) OR same timestamp+action+user+asset+details
        const sameId = earlierLog._id === log._id;
        const sameTimestamp = earlierLog.timestamp === log.timestamp;
        const sameAction = earlierLog.action === log.action;
        const sameUser = (earlierLog.allocatedToUserId || earlierLog.performedBy) === (log.allocatedToUserId || log.performedBy);
        const sameAsset = (earlierLog.hardwareAssetId || earlierLog.softwareAssetId) === (log.hardwareAssetId || log.softwareAssetId);
        const sameDetails = earlierLog.details === log.details;

        if (sameId && earlierLog._id && earlierLog._id !== '') return true;
        if (sameTimestamp && sameAction && sameUser && sameAsset && sameDetails) return true;

        return false;
      });
      return !earlierIdentical;
    });

    if (!searchQuery) return uniqueLogs;

    const query = searchQuery.toLowerCase();
    return uniqueLogs.filter(log =>
      (log.assetName && log.assetName.toLowerCase().includes(query)) ||
      (log.allocatedToUserName && log.allocatedToUserName.toLowerCase().includes(query)) ||
      (log.performedByName && log.performedByName.toLowerCase().includes(query)) ||
      (log.remarks && log.remarks.toLowerCase().includes(query)) ||
      (log.action && log.action.includes(query)) ||
      (log.details && log.details.toLowerCase().includes(query))
    );
  })();

  const calculateDuration = (allocatedDate?: string, returnedDate?: string) => {
    if (!allocatedDate) return '0 minutes';
    const start = new Date(allocatedDate);
    const end = returnedDate ? new Date(returnedDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    
    // Calculate different time units
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);
    
    // Build duration string
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    
    // If less than a minute, show seconds
    if (parts.length === 0) {
      if (seconds > 0) {
        parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
      } else {
        parts.push('0 seconds');
      }
    }
    
    // Join parts with commas and 'and' for the last part
    if (parts.length === 1) {
      return parts[0];
    } else if (parts.length === 2) {
      return parts.join(' and ');
    } else {
      return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
    }
  };

  const getBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'create': case 'assign': case 'allocate': return 'default';
      case 'update': return 'secondary';
      case 'delete': case 'return': case 'revoke': return 'destructive';
      case 'expired': return 'outline';
      default: return 'default';
    }
  };

  const formatAction = (action: string) => action.replace(/_/g, ' ').toUpperCase();

  const getFriendlyFieldName = (field: string): string => {
    const friendlyFieldNames: { [key: string]: string } = {
      'userId': 'User', 'hardwareAssetId': 'Hardware Asset', 'softwareAssetId': 'Software Asset', 'licenseCount': 'License Count',
      'expiryDate': 'Expiry Date', 'remarks': 'Remarks', 'customFields': 'Software Configuration', 'credentials': 'Credentials', 'status': 'Status',
      'username': 'Username', 'password': 'Password', 'apiKey': 'API Key', 'licenseKey': 'License Key', 'notes': 'Notes',
    };
    if (field.startsWith('Configuration Value (')) {
      return field.replace('Configuration Value (', 'Configuration Value: ').replace(')', '');
    }
    return friendlyFieldNames[field] || field;
  };

  const formatValue = (value: string | undefined, fieldName: string): string => {
    if (!value || value === '(empty)' || value === 'Empty' || value === 'null') return '(none)';
    if (['purchaseDate', 'startDate', 'endDate', 'allocatedDate', 'returnedDate', 'expiryDate'].includes(fieldName)) {
      try {
        if (value.includes('T') || value.includes('Z') || value.match(/^\d{4}-\d{2}-\d{2}$/)) return format(new Date(value), 'dd/MM/yyyy');
        else if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) return value;
      } catch (error) { return value; }
    }
    return value;
  };

  const groupedLogs = (() => {
    const groupMap = new Map<string, { key: string, timestamp: string, logs: AllocationLog[] }>();
    const groups: { key: string, timestamp: string, logs: AllocationLog[] }[] = [];
    const sortedLogs = [...filteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    sortedLogs.forEach(log => {
      let groupKey = '';
      if (mode === 'event') {
        const date = new Date(log.timestamp);
        const secondsRounded = Math.floor(date.getSeconds() / 2) * 2;
        const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${secondsRounded}`;
        const userId = log.performedBy || log.allocatedToUserId || 'unknown-user';
        groupKey = `event-group-${log.action}-${userId}-${timeKey}`;
      } else if (log.action === 'update') {
        const date = new Date(log.timestamp);
        const secondsRounded = Math.floor(date.getSeconds() / 2) * 2;
        const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${secondsRounded}`;
        if (log.softwareAllocationId || log.hardwareAllocationId) {
          const allocId = log.softwareAllocationId || log.hardwareAllocationId;
          groupKey = `update-alloc-${allocId}-${timeKey}`;
        } else {
          const userId = log.performedBy || log.allocatedToUserId || 'unknown-user';
          const assetId = log.hardwareAssetId || log.softwareAssetId || log.assetName || 'unknown-asset';
          groupKey = `update-fallback-${userId}-${assetId}-${timeKey}`;
        }
      } else {
        groupKey = `other-${log._id}`;
      }

      if (groupMap.has(groupKey)) {
        groupMap.get(groupKey)?.logs.push(log);
      } else {
        const newGroup = { key: groupKey, timestamp: log.timestamp, logs: [log] };
        groupMap.set(groupKey, newGroup);
        groups.push(newGroup);
      }
    });
    return groups;
  })();

  const logsForUserHistory = filteredLogs.filter(log =>
    log.action === 'assign' || log.action === 'return' || log.action === 'revoke' || log.action === 'allocate'
  );

  const groupedByAsset = (() => {
    if (mode === 'event') {
      return logsForUserHistory.reduce((acc, log) => {
        let rawId = null;
        if (log.hardwareAssetId && log.hardwareAssetId !== 'undefined' && log.hardwareAssetId !== 'null') {
          rawId = log.hardwareAssetId;
        } else if (log.softwareAssetId && log.softwareAssetId !== 'undefined' && log.softwareAssetId !== 'null') {
          rawId = log.softwareAssetId;
        }

        const validAssetName = (log.assetName && log.assetName !== 'Unknown Asset') ? log.assetName : null;
        const groupKey = rawId || validAssetName || 'unknown';

        if (!acc[groupKey]) {
          acc[groupKey] = {
            assetName: validAssetName || 'Unknown Asset',
            assetId: rawId || 'unknown',
            userHistory: [],
          };
        }

        const currentName = acc[groupKey].assetName;
        const newName = log.assetName;
        const isCurrentUnknown = !currentName || currentName === 'Unknown Asset';
        const isNewKnown = newName && newName !== 'Unknown Asset';

        if (isCurrentUnknown && isNewKnown) {
          acc[groupKey].assetName = newName!;
        } else if (isCurrentUnknown && !isNewKnown && newName) {
          acc[groupKey].assetName = newName;
        }

        acc[groupKey].userHistory.push({
          ...log,
          userName: log.allocatedToUserName || log.performedByName || 'Unknown User',
          userEmail: log.allocatedToUserEmail || log.performedByEmail || '',
        });

        return acc;
      }, {} as Record<string, {
        assetName: string;
        assetId: string;
        userHistory: (AllocationLog & { userName: string; userEmail: string })[]
      }>);
    }

    return logsForUserHistory.reduce((acc, log) => {
      let assetName = log.assetName;
      let assetId = log.hardwareAssetId || log.softwareAssetId || 'unknown';
      if (!assetName || assetName === 'Unknown Asset') {
        const logWithAssetName = logsForUserHistory.find(l =>
          (l.hardwareAssetId === log.hardwareAssetId || l.softwareAssetId === log.softwareAssetId) &&
          l.assetName && l.assetName !== 'Unknown Asset'
        );
        if (logWithAssetName) assetName = logWithAssetName.assetName;
      }
      if (!assetName) assetName = 'Unknown Asset';
      const assetKey = assetName || assetId;

      if (!acc[assetKey]) {
        acc[assetKey] = { assetName: assetName, assetId: assetId, userHistory: [] };
      }
      acc[assetKey].userHistory.push({
        ...log,
        userName: log.allocatedToUserName || log.performedByName || 'Unknown User',
        userEmail: log.allocatedToUserEmail || log.performedByEmail || '',
      });
      return acc;
    }, {} as Record<string, {
      assetName: string;
      assetId: string;
      userHistory: (AllocationLog & { userName: string; userEmail: string })[]
    }>);
  })();

  const groupedByAssetArray = Object.values(groupedByAsset).map(asset => ({
    ...asset,
    userHistory: asset.userHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocation History</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'asset' && `Complete allocation timeline for ${assetName || 'this asset'}`}
            {mode === 'user' && `Allocation history for ${userName || 'this user'}`}
            {mode === 'allocation' && `Allocation activity log for ${assetName || 'this allocation'}`}
            {mode === 'event' && `Allocation event history for ${userName || 'this user'} (${allocationIds?.length || 0} allocations)`}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="timeline">Allocation Timeline</TabsTrigger>
            <TabsTrigger value="user">Asset History</TabsTrigger>
          </TabsList>

          <div className="flex gap-4 my-4">
            <div className="w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="assign">Assign</SelectItem>
                  <SelectItem value="allocate">Allocate</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="revoke">Revoke</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, asset, or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <TabsContent value="timeline" className="space-y-4 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <span className="ml-2">Loading logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs found for this selection
              </div>
            ) : (
              groupedLogs.map((group, groupIndex) => {
                const mainLog = group.logs[0];
                const timestamp = new Date(mainLog.timestamp);
                const isGroupedEvent = group.logs.length > 1 && mode === 'event';

                return (
                  <div key={`group-${groupIndex}`} className="border rounded-lg p-4 space-y-2 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getBadgeVariant(mainLog.action)}>
                          {formatAction(mainLog.action)}
                        </Badge>
                        {isGroupedEvent && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Batch Operation ({group.logs.length} Assets)
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(timestamp, 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <strong>User:</strong> {mainLog.allocatedToUserName || mainLog.performedByName} ({mainLog.allocatedToUserEmail || mainLog.performedByEmail})
                        </div>
                        {!isGroupedEvent && mainLog.assetName && (
                          <div>
                            <strong>Asset:</strong> {mainLog.assetName}
                          </div>
                        )}
                      </div>

                      {isGroupedEvent && (
                        <div className="border rounded-md bg-white p-2 mt-2">
                          <h4 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">Affected Assets</h4>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {group.logs.map((log, idx) => (
                              <div key={idx} className="flex flex-col border-b last:border-0 pb-2 last:pb-0">
                                <div className="flex justify-between items-start">
                                  <span className="font-medium">{log.assetName || 'Unknown Asset'}</span>
                                </div>
                                {log.action === 'update' && (
                                  <div className="pl-2 mt-1 text-xs">
                                    {log.field && (log.oldValue !== undefined || log.newValue !== undefined) ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">{getFriendlyFieldName(log.field)}:</span>
                                        <span className="text-red-600 line-through">{formatValue(log.oldValue, log.field)}</span>
                                        <span>→</span>
                                        <span className="text-green-600">{formatValue(log.newValue, log.field)}</span>
                                      </div>
                                    ) : formatLogDetails(log.details || '')}
                                  </div>
                                )}
                                {(log.action === 'assign' || log.action === 'allocate') && log.remarks && (
                                  <div className="text-xs text-gray-500 mt-1">Remarks: {log.remarks}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isGroupedEvent && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            {mainLog.action === 'revoke' ? (
                              <>
                                {mainLog.allocatedDate && (
                                  <div>
                                    <strong>Allocated Date:</strong> {new Date(mainLog.allocatedDate).toLocaleDateString()}
                                  </div>
                                )}
                                {mainLog.timestamp && (
                                  <div>
                                    <strong>Revoke Date:</strong> {new Date(mainLog.timestamp).toLocaleDateString()}
                                  </div>
                                )}
                                {mainLog.allocatedDate && mainLog.timestamp && (
                                  <div className="col-span-2">
                                    <strong>Duration:</strong> {calculateDuration(mainLog.allocatedDate, mainLog.timestamp)}
                                  </div>
                                )}
                              </>
                            ) : mainLog.action === 'return' ? (
                              <>
                                {mainLog.allocatedDate && (
                                  <div>
                                    <strong>Allocated Date:</strong> {new Date(mainLog.allocatedDate).toLocaleDateString()}
                                  </div>
                                )}
                                {mainLog.returnedDate && (
                                  <div>
                                    <strong>Return Date:</strong> {new Date(mainLog.returnedDate).toLocaleDateString()}
                                  </div>
                                )}
                                {mainLog.returnedDate && mainLog.allocatedDate && (
                                  <div className="col-span-2">
                                    <strong>Duration:</strong> {calculateDuration(mainLog.allocatedDate, mainLog.returnedDate)}
                                  </div>
                                )}
                              </>
                            ) : (mainLog.action === 'assign' || mainLog.action === 'allocate' || mainLog.action === 'create') && mainLog.allocatedDate && (
                              <div>
                                <strong>Allocated Date:</strong> {new Date(mainLog.allocatedDate).toLocaleDateString()}
                              </div>
                            )}

                            {mainLog.licenseCount && (
                              <div>
                                <strong>License Count:</strong> {mainLog.licenseCount}
                              </div>
                            )}
                            {mainLog.expiryDate && (
                              <div>
                                <strong>Expiry Date:</strong> {new Date(mainLog.expiryDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {mainLog.remarks && (
                            <div className="mt-1">
                              <strong>Remarks:</strong> {mainLog.remarks}
                            </div>
                          )}

                          {mainLog.action === 'update' && (
                            <div className="mt-2">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-900">• Change Details</h4>
                                <div className="space-y-2 pl-4">
                                  {group.logs.map((log, logIndex) => (
                                    <div key={`log-${logIndex}`}>
                                      {log.field && (log.oldValue !== undefined || log.newValue !== undefined) ? (
                                        <div className="flex items-center gap-2 text-sm">
                                          <span className="font-medium text-gray-700 min-w-[120px]">
                                            {getFriendlyFieldName(log.field)}:
                                          </span>
                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 line-through">
                                            {formatValue(log.oldValue, log.field)}
                                          </Badge>
                                          <span className="text-blue-500 font-bold">→</span>
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {formatValue(log.newValue, log.field)}
                                          </Badge>
                                        </div>
                                      ) : (
                                        formatLogDetails(log.details || '')
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                        <strong>Performed by:</strong> {mainLog.performedByName} ({mainLog.performedByEmail})
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="user" className="space-y-4 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <span className="ml-2">Loading device history...</span>
              </div>
            ) : ((mode === 'user' || (mode === 'event' && effectiveUserId)) && allocationType === 'hardware') ? (
              <>
                {/* Summary Cards */}
                {summary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{summary.totalDevices}</div>
                        <p className="text-xs text-muted-foreground">Total Devices</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{summary.activeDevices}</div>
                        <p className="text-xs text-muted-foreground">Active Devices</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-600">{summary.returnedDevices}</div>
                        <p className="text-xs text-muted-foreground">Returned Devices</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Device List */}
                {deviceGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No device allocation history found for this user.</p>
                    <p className="text-sm mt-2">This user has not been allocated any hardware devices yet.</p>
                  </div>
                ) : (
                  deviceGroups
                    .filter(device => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        device.assetName?.toLowerCase().includes(query) ||
                        device.assetBrand?.toLowerCase().includes(query) ||
                        device.assetModel?.toLowerCase().includes(query) ||
                        device.assetSerialNumber?.toLowerCase().includes(query)
                      );
                    })
                    .map((device) => {
                      const isActive = device.currentStatus === 'ACTIVE';
                      const assignLog = device.logs.find((log: any) => log.action === 'assign');
                      const returnLog = device.logs.find((log: any) => log.action === 'return');
                      const allocatedDate = assignLog?.allocatedDate || assignLog?.timestamp || device.firstAssignedDate;
                      const returnedDate = returnLog?.returnedDate || returnLog?.timestamp || device.lastReturnedDate;

                      return (
                        <Card
                          key={device.hardwareAssetId}
                          className={isActive ? 'ring-2 ring-green-500 bg-green-50/50' : ''}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {device.assetName || 'Unknown Device'}
                                  {isActive && (
                                    <Badge variant="default" className="bg-green-600">
                                      ACTIVE
                                    </Badge>
                                  )}
                                  {!isActive && device.currentStatus === 'RETURNED' && (
                                    <Badge variant="secondary">
                                      RETURNED
                                    </Badge>
                                  )}
                                </CardTitle>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {device.assetBrand && <span>{device.assetBrand}</span>}
                                  {device.assetModel && <span> - {device.assetModel}</span>}
                                  {device.assetSerialNumber && <span className="ml-2">(SN: {device.assetSerialNumber})</span>}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Device Timeline Summary */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {allocatedDate && (
                                <div>
                                  <strong>Assigned:</strong>{' '}
                                  <span className="text-muted-foreground">
                                    {format(new Date(allocatedDate), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                              )}
                              {returnedDate && (
                                <div>
                                  <strong>Returned:</strong>{' '}
                                  <span className="text-muted-foreground">
                                    {format(new Date(returnedDate), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                              )}
                              {allocatedDate && returnedDate && (
                                <div className="col-span-2">
                                  <strong>Duration:</strong>{' '}
                                  <span className="text-muted-foreground">
                                    {calculateDuration(allocatedDate, returnedDate)}
                                  </span>
                                </div>
                              )}
                              {allocatedDate && !returnedDate && isActive && (
                                <div className="col-span-2">
                                  <strong>Duration:</strong>{' '}
                                  <span className="text-muted-foreground">
                                    {calculateDuration(allocatedDate, new Date().toISOString())} (ongoing)
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Activity Logs */}
                            <div className="border-t pt-3">
                              <p className="text-sm font-medium mb-2">Activity History:</p>
                              <div className="space-y-2">
                                {device.logs.slice(0, 5).map((log: any, index: number) => (
                                  <div key={`device-log-${device.hardwareAssetId}-${index}`} className="text-sm border rounded p-2 bg-slate-50">
                                    <div className="flex items-center justify-between">
                                      <Badge variant={getBadgeVariant(log.action)} className="text-xs">
                                        {formatAction(log.action)}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                                      </span>
                                    </div>
                                    {log.remarks && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        <strong>Remarks:</strong> {log.remarks}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <strong>By:</strong> {log.performedByName}
                                    </div>
                                  </div>
                                ))}
                                {device.logs.length > 5 && (
                                  <p className="text-xs text-muted-foreground text-center">
                                    + {device.logs.length - 5} more activity record(s)
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </>
            ) : (
              // Original asset history view for other modes
              groupedByAssetArray.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No allocation history found for assets
                </div>
              ) : (
                groupedByAssetArray.map((asset) => (
                  <Card key={asset.assetId}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {asset.assetName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {asset.userHistory.length} allocation record(s) - showing who had this asset over time
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {asset.userHistory.map((log, index) => (
                        <div key={`user-history-${log._id}-${log.timestamp}-${index}`} className="border rounded-lg p-3 bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={getBadgeVariant(log.action)}>
                                {formatAction(log.action)}
                              </Badge>
                              <span className="text-sm font-medium">
                                {log.userName} ({log.userEmail})
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </span>
                          </div>

                          <div className="text-sm space-y-1">
                            {log.allocatedDate && (
                              <div className="text-muted-foreground">
                                <strong>Allocated:</strong> {new Date(log.allocatedDate).toLocaleDateString()}
                              </div>
                            )}
                            {log.action === 'revoke' && log.timestamp && (
                              <div className="text-muted-foreground">
                                <strong>Revoke Date:</strong> {new Date(log.timestamp).toLocaleDateString()}
                                {log.allocatedDate && (
                                  <span className="ml-2">
                                    (Duration: {calculateDuration(log.allocatedDate, log.timestamp)})
                                  </span>
                                )}
                              </div>
                            )}
                            {log.action === 'return' && log.returnedDate && (
                              <div className="text-muted-foreground">
                                <strong>Return Date:</strong> {new Date(log.returnedDate).toLocaleDateString()}
                                {log.allocatedDate && (
                                  <span className="ml-2">
                                    (Duration: {calculateDuration(log.allocatedDate, log.returnedDate)})
                                  </span>
                                )}
                              </div>
                            )}
                            {log.action !== 'revoke' && log.action !== 'return' && log.returnedDate && (
                              <div className="text-muted-foreground">
                                <strong>Returned:</strong> {new Date(log.returnedDate).toLocaleDateString()}
                                {log.allocatedDate && (
                                  <span className="ml-2">
                                    (Duration: {calculateDuration(log.allocatedDate, log.returnedDate)})
                                  </span>
                                )}
                              </div>
                            )}
                            {log.remarks && (
                              <div className="text-muted-foreground">
                                <strong>Remarks:</strong> {log.remarks}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground pt-1">
                              <strong>Action performed by:</strong> {log.performedByName} ({log.performedByEmail})
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )
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
