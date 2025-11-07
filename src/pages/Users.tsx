import { useState, useEffect, useRef } from 'react';
import { hashPassword } from '@/lib/crypto';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { Plus, Edit, Trash2, Users as UsersIcon, ChevronDown, ChevronUp, Eye, EyeOff, X, Building2, BookOpen, FolderTree, RefreshCw } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MultiSelectDropdown, { OptionType } from '@/components/common/MultiSelectDropdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrganizationsContent } from '@/pages/Organization';
import { CollectionsContent } from '@/pages/Collections';
import { FoldersContent } from '@/pages/Folders';
import { Textarea } from '@/components/ui/textarea';
import PasswordGenerator from '@/components/common/PasswordGenerator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions?: UserPermissions;
}

interface Organization {
  _id: string;
  name: string;
  description?: string;
}

interface Collection {
  _id: string;
  name: string;
  organizationId: string;
  description?: string;
}

interface Folder {
  _id: string;
  name: string;
  collectionId: string;
  organizationId: string;
  description?: string;
}

interface UserPermissions {
  organizations: string[];
  collections: string[];
  folders: string[];
}

interface FormData {
  username: string;
  email: string;
  password: string;
  permissions: UserPermissions;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<string[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Password generator states
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [isEditPasswordGeneratorOpen, setIsEditPasswordGeneratorOpen] = useState(false);

  // Manage dialog states
  const [isManageOrgDialogOpen, setIsManageOrgDialogOpen] = useState(false);
  const [isManageCollectionDialogOpen, setIsManageCollectionDialogOpen] = useState(false);
  const [isManageFolderDialogOpen, setIsManageFolderDialogOpen] = useState(false);

  // Edit form states
  const [editFormData, setEditFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    permissions: {
      organizations: [],
      collections: [],
      folders: []
    }
  });
  const [editSelectedOrganizations, setEditSelectedOrganizations] = useState<string[]>([]);
  const [editSelectedCollections, setEditSelectedCollections] = useState<string[]>([]);
  const [editSelectedFolders, setEditSelectedFolders] = useState<string[]>([]);
  const [editExpandedCollections, setEditExpandedCollections] = useState<string[]>([]);
  const [editFoldersAutoExpanded, setEditFoldersAutoExpanded] = useState(false);

  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    permissions: {
      organizations: [],
      collections: [],
      folders: []
    }
  });

  useEffect(() => {
    fetchUsers(currentPage, rowsPerPage, searchTerm);
  }, [currentPage, rowsPerPage, searchTerm]);

  useEffect(() => {
    if (isDialogOpen || isEditDialogOpen) {
      fetchOrganizations();
    }
  }, [isDialogOpen, isEditDialogOpen]);

  // Clear form data when create dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setFormData({
        username: '',
        email: '',
        password: '',
        permissions: { organizations: [], collections: [], folders: [] }
      });
      setSelectedOrganizations([]);
      setSelectedCollections([]);
      setSelectedFolders([]);
      setCollections([]);
      setFolders([]);
      setExpandedCollections([]);
      setShowPassword(false);
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (selectedOrganizations.length > 0) {
      // Fetch collections for all selected organizations
      selectedOrganizations.forEach(orgId => {
        fetchCollections(orgId);
      });
      setSelectedCollections([]);
      setSelectedFolders([]);
      setFolders([]);
      setFormData(prev => ({
        ...prev,
        permissions: {
          organizations: selectedOrganizations,
          collections: [],
          folders: []
        }
      }));
    } else {
      setCollections([]);
      setFolders([]);
      setSelectedCollections([]);
      setSelectedFolders([]);
      setFormData(prev => ({
        ...prev,
        permissions: {
          organizations: [],
          collections: [],
          folders: []
        }
      }));
    }
  }, [selectedOrganizations]);

  useEffect(() => {
    if (editSelectedOrganizations.length > 0) {
      // Fetch collections for all selected organizations in edit mode
      editSelectedOrganizations.forEach(orgId => {
        fetchCollections(orgId);
      });
      setEditFormData(prev => ({
        ...prev,
        permissions: {
          organizations: editSelectedOrganizations,
          collections: editSelectedCollections,
          folders: editSelectedFolders
        }
      }));
    }
  }, [editSelectedOrganizations]);

  useEffect(() => {
    if (selectedOrganizations.length > 0 && selectedCollections.length > 0) {
      fetchFolders(selectedOrganizations, selectedCollections);
    } else {
      setFolders([]);
      setSelectedFolders([]);
    }
  }, [selectedOrganizations, selectedCollections]);

  // Ref to track if we're initializing edit mode to prevent useEffect from interfering
  const isInitializingEditRef = useRef(false);

  useEffect(() => {
    // Skip if we're in the middle of initializing edit mode (folders are being set manually)
    if (isInitializingEditRef.current) {
      return;
    }

    (async () => {
      if (editSelectedOrganizations.length > 0 && editSelectedCollections.length > 0 && collections.length > 0) {
        const allFolders: Folder[] = [];
        for (const orgId of editSelectedOrganizations) {
          const orgCollections = collections
            .filter(col => col.organizationId === orgId)
            .map(col => col._id)
            .filter(id => editSelectedCollections.includes(id));
          if (orgCollections.length === 0) continue;
          const data = await companyService.getFolders(orgId, orgCollections);
          const mappedFolders = data.folders.map((folder: any) => ({
            _id: folder._id ? (typeof folder._id === 'string' ? folder._id : folder._id.toString()) : '',
            name: folder.folderName || folder.name || '',
            description: folder.description || "",
            collectionId: folder.collectionId ? (typeof folder.collectionId === 'string' ? folder.collectionId : folder.collectionId.toString()) : '',
            organizationId: folder.organizationId ? (typeof folder.organizationId === 'string' ? folder.organizationId : folder.organizationId.toString()) : '',
          }));
          allFolders.push(...mappedFolders);
        }
        setFolders(allFolders);
      } else {
        setFolders([]);
      }
    })();
  }, [editSelectedOrganizations, editSelectedCollections, collections]);

  // Set editSelectedFolders after folders are loaded when dialog is open
  // This ensures folders are properly prefilled when dialog reopens or on first open
  useEffect(() => {
    if (isEditDialogOpen && folders.length > 0 && editingUser) {
      // Get folder IDs from editingUser's permissions
      const folderIds = (editingUser.permissions?.folders || []).map((f: any) => {
        if (typeof f === 'object' && f !== null) {
          return f._id ? f._id.toString() : f.toString();
        }
        return f.toString();
      });
      // Only set if folders match what's available - normalize IDs for comparison
      const validFolderIds = folders.map(f => f._id.toString());
      const validSelectedFolders = folderIds.filter(id => validFolderIds.includes(id));

      // Always update if folders are loaded - check current state using functional update
      setEditSelectedFolders(prevFolders => {
        const prevFoldersStr = prevFolders.map(f => f.toString()).sort().join(',');
        const newFoldersStr = validSelectedFolders.sort().join(',');

        // Update if:
        // 1. Folders don't match
        // 2. Previous selection is empty but we have valid folders
        if (prevFoldersStr !== newFoldersStr ||
          (prevFolders.length === 0 && validSelectedFolders.length > 0)) {
          return validSelectedFolders;
        }
        return prevFolders;
      });
    } else if (isEditDialogOpen && folders.length === 0 && editingUser) {
      // If folders are empty, clear selection
      setEditSelectedFolders([]);
    }
  }, [isEditDialogOpen, folders, editingUser]);

  // Clear folders and selected folders when edit dialog closes - but delay slightly to allow dialog to close smoothly
  useEffect(() => {
    if (!isEditDialogOpen) {
      // Delay clearing to ensure dialog closes smoothly and doesn't interfere with reopening
      const timeoutId = setTimeout(() => {
        setFolders([]);
        setEditSelectedFolders([]);
      }, 300); // Delay clearing until after dialog animation completes

      return () => clearTimeout(timeoutId);
    }
  }, [isEditDialogOpen]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        organizations: selectedOrganizations,
        collections: selectedCollections,
        folders: selectedFolders
      }
    }));
  }, [selectedOrganizations, selectedCollections, selectedFolders]);

  useEffect(() => {
    setEditFormData(prev => ({
      ...prev,
      permissions: {
        organizations: editSelectedOrganizations,
        collections: editSelectedCollections,
        folders: editSelectedFolders
      }
    }));
  }, [editSelectedOrganizations, editSelectedCollections, editSelectedFolders]);

  const fetchUsers = async (page = 1, limit = 10, q = '') => {
    setLoading(true);
    try {
      const data = await companyService.getUsers(page, limit, q);
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    setLoadingOrganizations(true);
    try {
      const data = await companyService.getOrganizations();
      const mappedOrganizations = data.organizations.map((org: any) => ({
        _id: org._id,
        name: org.organizationName || org.name,
        description: org.organizationEmail || org.description
      }));
      setOrganizations(mappedOrganizations);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations',
        variant: 'destructive',
      });
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const fetchCollections = async (organizationId: string | { _id: string }): Promise<Collection[]> => {
    const finalId = typeof organizationId === 'object'
      ? organizationId._id
      : organizationId;

    setLoadingCollections(true);

    try {
      const data = await companyService.getCollections(finalId);
      const mappedCollections = data.collections.map((collection: any) => ({
        _id: collection._id,
        name: collection.collectionName || collection.name,
        description: collection.description,
        organizationId: collection.organizationId,
      }));
      // Merge with existing collections
      setCollections(prev => {
        const newCollections = [...prev];
        mappedCollections.forEach(newCol => {
          if (!newCollections.find(col => col._id === newCol._id)) {
            newCollections.push(newCol);
          }
        });
        return newCollections;
      });
      return mappedCollections; // Return collections so we can use them immediately
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch collections',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchFolders = async (
    organizationIds: string[],
    collectionIds: string[],
    collectionsData?: Collection[] // Optional: pass collections directly instead of using state
  ): Promise<Folder[]> => {
    setLoadingFolders(true);
    try {
      const allFolders: Folder[] = [];
      // Use passed collectionsData if provided, otherwise use state
      const collectionsToUse = collectionsData || collections;

      for (const orgId of organizationIds) {
        // Only send collections that belong to this org
        const orgCollections = collectionsToUse
          .filter(col => {
            const colOrgId = col.organizationId ? (typeof col.organizationId === 'string' ? col.organizationId : String(col.organizationId)) : '';
            const normalizedOrgId = typeof orgId === 'string' ? orgId : String(orgId);
            return colOrgId === normalizedOrgId;
          })
          .map(col => col._id)
          .filter(id => {
            const colId = typeof id === 'string' ? id : String(id);
            return collectionIds.some(cid => {
              const normalizedCid = typeof cid === 'string' ? cid : String(cid);
              return colId === normalizedCid;
            });
          });
        if (orgCollections.length === 0) continue;
        const data = await companyService.getFolders(orgId, orgCollections);
        const mappedFolders = data.folders.map((folder: any) => ({
          _id: folder._id ? (typeof folder._id === 'string' ? folder._id : folder._id.toString()) : '',
          name: folder.folderName || folder.name || '',
          description: folder.description || "",
          collectionId: folder.collectionId ? (typeof folder.collectionId === 'string' ? folder.collectionId : folder.collectionId.toString()) : '',
          organizationId: folder.organizationId ? (typeof folder.organizationId === 'string' ? folder.organizationId : folder.organizationId.toString()) : '',
        }));
        allFolders.push(...mappedFolders);
      }
      setFolders(allFolders);
      return allFolders; // Return folders so we can use them immediately
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch folders",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoadingFolders(false);
    }
  };

  // Delete confirmation modal state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = (id: string) => {
    setDeleteUserId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUserId) return;
    try {
      await companyService.deleteUser(deleteUserId);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
    }
  };

  // Update the handleEdit function for multiple organizations
  const handleEdit = async (user: User) => {
    // Clear previous state first to ensure clean start
    setFolders([]);
    setEditSelectedFolders([]);
    setEditSelectedOrganizations([]);
    setEditSelectedCollections([]);

    setEditingUser(user);

    // Extract _id from permissions arrays
    const orgIds = (user.permissions?.organizations || []).map((org: any) =>
      typeof org === 'object' && org !== null ? (org as any)._id : org
    );
    const collectionIds = (user.permissions?.collections || []).map((c: any) =>
      typeof c === 'object' && c !== null ? c._id : c
    );
    const folderIds = (user.permissions?.folders || []).map((f: any) =>
      typeof f === 'object' && f !== null ? f._id : f
    );

    setEditFormData({
      username: user.username,
      email: user.email,
      password: '',
      permissions: {
        organizations: orgIds,
        collections: collectionIds,
        folders: folderIds
      }
    });

    if (orgIds.length > 0) {
      // Set flag to prevent useEffect from interfering during initialization
      isInitializingEditRef.current = true;

      // First ensure organizations are loaded
      if (organizations.length === 0) {
        await fetchOrganizations();
      }

      // Fetch collections for all organizations and wait for them FIRST
      // This ensures collections are loaded before we set editSelectedCollections
      const collectionPromises = orgIds.map(orgId => fetchCollections(orgId));
      const fetchedCollectionsArrays = await Promise.all(collectionPromises);
      // Flatten all collections into a single array
      const allFetchedCollections = fetchedCollectionsArrays.flat();

      // Now set the selected organizations and collections
      // This would normally trigger the useEffect that fetches folders, but we're blocking it
      setEditSelectedOrganizations(orgIds);
      setEditSelectedCollections(collectionIds);

      // Wait a moment for collections state to update (for useEffect that uses state)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Now fetch folders and wait for them - pass collections directly to avoid state timing issues
      if (collectionIds.length > 0) {
        const fetchedFolders = await fetchFolders(orgIds, collectionIds, allFetchedCollections);
        // After fetchFolders completes, it returns the folders and sets folders state
        // Use the returned folders immediately to set editSelectedFolders
        const normalizedFolderIds = folderIds.map(id => typeof id === 'string' ? id : id.toString());
        const validFolderIds = fetchedFolders.map(f => f._id.toString());
        const validSelectedFolders = normalizedFolderIds.filter(id => validFolderIds.includes(id));

        // Set folders state - this will trigger the useEffect to set editSelectedFolders
        setFolders(fetchedFolders);
        // Also set editSelectedFolders directly as a backup (useEffect will handle it too)
        setEditSelectedFolders(validSelectedFolders);
        // Wait a moment to ensure state is set before dialog opens
        await new Promise(resolve => setTimeout(resolve, 150));

        // Set expanded collections
        const collectionsWithFolders = collectionIds.filter(collectionId => {
          const normalizedCollectionId = typeof collectionId === 'string' ? collectionId : String(collectionId);
          return fetchedFolders.some(folder => {
            const folderCollectionId = folder.collectionId ? (typeof folder.collectionId === 'string' ? folder.collectionId : String(folder.collectionId)) : '';
            return folderCollectionId === normalizedCollectionId;
          });
        });
        setEditExpandedCollections(collectionsWithFolders);
      } else {
        setFolders([]);
        setEditSelectedFolders([]);
      }

      // Clear the flag after initialization is complete
      setTimeout(() => {
        isInitializingEditRef.current = false;
      }, 100);
    } else {
      setEditSelectedOrganizations([]);
      setEditSelectedCollections([]);
      setEditSelectedFolders([]);
      setEditExpandedCollections([]);
    }
    setEditFoldersAutoExpanded(false);
    // Open dialog after all data is loaded
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: any = {
        username: editFormData.username,
        email: editFormData.email,
        permissions: editFormData.permissions
      };

      if (editFormData.password.trim() !== '') {
        updateData.password = hashPassword(editFormData.password);
      }

      await companyService.updateUser(editingUser._id, updateData);
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setEditFormData({
        username: '',
        email: '',
        password: '',
        permissions: {
          organizations: [],
          collections: [],
          folders: []
        }
      });
      setEditSelectedOrganizations([]);
      setEditSelectedCollections([]);
      setEditSelectedFolders([]);
      setShowEditPassword(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = async (userId: string, newStatus: boolean) => {
    try {
      await companyService.updateUserStatus(userId, newStatus);
      toast({
        title: 'Success',
        description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchUsers(currentPage, rowsPerPage, searchTerm);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  // Organization handlers
  const handleOrganizationToggle = (orgId: string) => {
    setSelectedOrganizations(prev => {
      const newOrganizations = prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId];

      if (!newOrganizations.includes(orgId)) {
        // Remove collections and folders that belong to the deselected organization
        const collectionsToRemove = collections
          .filter(collection => collection.organizationId === orgId)
          .map(collection => collection._id);

        setSelectedCollections(prevCols =>
          prevCols.filter(colId => !collectionsToRemove.includes(colId))
        );

        const foldersToRemove = folders
          .filter(folder => folder.organizationId === orgId)
          .map(folder => folder._id);

        setSelectedFolders(prevFolders =>
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newOrganizations;
    });
  };

  const handleEditOrganizationToggle = (orgId: string) => {
    setEditSelectedOrganizations(prev => {
      const newOrganizations = prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId];

      if (!newOrganizations.includes(orgId)) {
        // Remove collections and folders that belong to the deselected organization
        const collectionsToRemove = collections
          .filter(collection => collection.organizationId === orgId)
          .map(collection => collection._id);

        setEditSelectedCollections(prevCols =>
          prevCols.filter(colId => !collectionsToRemove.includes(colId))
        );

        const foldersToRemove = folders
          .filter(folder => folder.organizationId === orgId)
          .map(folder => folder._id);

        setEditSelectedFolders(prevFolders =>
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newOrganizations;
    });
  };

  // Collection handlers
  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollections(prev => {
      const newCollections = prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId];

      if (!newCollections.includes(collectionId)) {
        const foldersToRemove = folders
          .filter(folder => folder.collectionId === collectionId)
          .map(folder => folder._id);
        setSelectedFolders(prevFolders =>
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newCollections;
    });
  };

  const handleEditCollectionToggle = (collectionId: string) => {
    setEditSelectedCollections(prev => {
      const newCollections = prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId];

      if (!newCollections.includes(collectionId)) {
        const foldersToRemove = folders
          .filter(folder => folder.collectionId === collectionId)
          .map(folder => folder._id);
        setEditSelectedFolders(prevFolders =>
          prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
        );
      }

      return newCollections;
    });
  };

  // Folder handlers
  const handleFolderToggle = (folderId: string) => {
    setSelectedFolders(prev => {
      return prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId];
    });
  };

  const handleEditFolderToggle = (folderId: string) => {
    setEditSelectedFolders(prev => {
      return prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId];
    });
  };

  const handleSelectAllFoldersInCollection = (collectionId: string) => {
    const collectionFolders = folders
      .filter(folder => folder.collectionId === collectionId)
      .map(folder => folder._id);

    setSelectedFolders(prev => {
      const allSelected = collectionFolders.every(folderId => prev.includes(folderId));
      return allSelected
        ? prev.filter(folderId => !collectionFolders.includes(folderId))
        : [...prev, ...collectionFolders.filter(folderId => !prev.includes(folderId))];
    });
  };

  const handleEditSelectAllFoldersInCollection = (collectionId: string) => {
    const collectionFolders = folders
      .filter(folder => folder.collectionId === collectionId)
      .map(folder => folder._id);

    setEditSelectedFolders(prev => {
      const allSelected = collectionFolders.every(folderId => prev.includes(folderId));
      return allSelected
        ? prev.filter(folderId => !collectionFolders.includes(folderId))
        : [...prev, ...collectionFolders.filter(folderId => !prev.includes(folderId))];
    });
  };

  const toggleCollectionExpansion = (collectionId: string) => {
    setExpandedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const toggleEditCollectionExpansion = async (collectionId: string) => {
    setEditExpandedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
    // If expanding, fetch folders for this collection if not already present
    if (!editExpandedCollections.includes(collectionId)) {
      const orgId = collections.find(col => col._id === collectionId)?.organizationId;
      if (orgId && !folders.some(f => f.collectionId === collectionId)) {
        const data = await companyService.getFolders(orgId, [collectionId]);
        const mappedFolders = data.folders.map((folder: any) => ({
          _id: folder._id,
          name: folder.folderName || folder.name,
          description: folder.description || "",
          collectionId: folder.collectionId,
          organizationId: folder.organizationId,
        }));
        setFolders(prev => [...prev, ...mappedFolders]);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleEditPasswordVisibility = () => {
    setShowEditPassword(!showEditPassword);
  };

  const handleGeneratedPassword = (password: string) => {
    setFormData({ ...formData, password });
    setIsPasswordGeneratorOpen(false);
  };

  const handleEditGeneratedPassword = (password: string) => {
    setEditFormData({ ...editFormData, password });
    setIsEditPasswordGeneratorOpen(false);
  };

  useEffect(() => {
    if (folders.length > 0 && selectedCollections.length > 0) {
      const collectionsWithFolders = new Set(folders.map(folder => folder.collectionId));
      const newExpanded = selectedCollections.filter(collectionId =>
        collectionsWithFolders.has(collectionId)
      );
      setExpandedCollections(newExpanded);
    }
  }, [folders, selectedCollections]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      setEditFoldersAutoExpanded(false);
      return;
    }
    if (!editFoldersAutoExpanded && folders.length > 0 && editSelectedCollections.length > 0) {
      const collectionsWithFolders = new Set(folders.map(folder => folder.collectionId));
      const newExpanded = editSelectedCollections.filter(collectionId =>
        collectionsWithFolders.has(collectionId)
      );
      setEditExpandedCollections(newExpanded);
      setEditFoldersAutoExpanded(true);
    }
  }, [folders, editSelectedCollections, isEditDialogOpen, editFoldersAutoExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        ...formData,
        password: formData.password ? hashPassword(formData.password) : '',
      };
      await companyService.createUser(userData);
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      setIsDialogOpen(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        permissions: { organizations: [], collections: [], folders: [] }
      });
      setSelectedOrganizations([]);
      setSelectedCollections([]);
      setSelectedFolders([]);
      setExpandedCollections([]);
      setShowPassword(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(totalUsers / rowsPerPage);

  // Helper function to render organization selection
  const renderOrganizationSelection = (
    isEdit: boolean,
    selectedOrgs: string[],
    onOrgChange: (orgIds: string[]) => void
  ) => {
    const orgOptions: OptionType[] = organizations.map(org => ({
      value: org._id,
      label: org.name + (org.description ? ` (${org.description})` : "")
    }));
    return (
      <div className="my-2">
        <MultiSelectDropdown
          options={orgOptions}
          value={selectedOrgs}
          onChange={onOrgChange}
          label="Organizations *"
          placeholder="Select organizations..."
          isDisabled={loadingOrganizations}
        />
      </div>
    );
  };

  const renderPermissionSection = (
    isEdit: boolean,
    selectedOrgs: string[],
    selectedCols: string[],
    selectedFolds: string[],
    expandedCols: string[],
    onOrgToggle: (orgId: string) => void,
    onColToggle: (colId: string) => void,
    onFolderToggle: (folderId: string) => void,
    onSelectAllFolders: (colId: string) => void,
    onToggleExpand: (colId: string) => void
  ) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Permissions & Access</h3>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Users will have full access to the selected organizations, collections, and folders.
        </p>
      </div>

      <div className="max-h-56 overflow-y-auto">
        {renderOrganizationSelection(isEdit, selectedOrgs, (ids) => {
          // Update organizations and handle cascade
          if (isEdit) {
            setEditSelectedOrganizations(ids);

            // Remove collections and folders that belong to deselected organizations
            const removed = editSelectedOrganizations.filter(id => !ids.includes(id));
            removed.forEach(orgId => {
              const collectionsToRemove = collections
                .filter(collection => collection.organizationId === orgId)
                .map(collection => collection._id);

              setEditSelectedCollections(prevCols =>
                prevCols.filter(colId => !collectionsToRemove.includes(colId))
              );

              const foldersToRemove = folders
                .filter(folder => folder.organizationId === orgId)
                .map(folder => folder._id);

              setEditSelectedFolders(prevFolders =>
                prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
              );
            });
          } else {
            setSelectedOrganizations(ids);

            // Remove collections and folders that belong to deselected organizations
            const removed = selectedOrganizations.filter(id => !ids.includes(id));
            removed.forEach(orgId => {
              const collectionsToRemove = collections
                .filter(collection => collection.organizationId === orgId)
                .map(collection => collection._id);

              setSelectedCollections(prevCols =>
                prevCols.filter(colId => !collectionsToRemove.includes(colId))
              );

              const foldersToRemove = folders
                .filter(folder => folder.organizationId === orgId)
                .map(folder => folder._id);

              setSelectedFolders(prevFolders =>
                prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
              );
            });
          }
        })}
      </div>

      {selectedOrgs.length > 0 && (
        <div className="my-2 max-h-56 overflow-y-auto">
          <MultiSelectDropdown
            options={collections.filter(col => selectedOrgs.includes(col.organizationId)).map(col => ({ value: col._id, label: col.name + (col.description ? ` (${col.description})` : "") }))}
            value={selectedCols}
            onChange={(ids) => {
              if (isEdit) {
                setEditSelectedCollections(ids);

                // Remove folders that belong to deselected collections
                const prevCols = editSelectedCollections;
                const removed = prevCols.filter(id => !ids.includes(id));
                removed.forEach(colId => {
                  const foldersToRemove = folders
                    .filter(folder => folder.collectionId === colId)
                    .map(folder => folder._id);

                  setEditSelectedFolders(prevFolders =>
                    prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
                  );
                });
              } else {
                setSelectedCollections(ids);

                // Remove folders that belong to deselected collections
                const prevCols = selectedCollections;
                const removed = prevCols.filter(id => !ids.includes(id));
                removed.forEach(colId => {
                  const foldersToRemove = folders
                    .filter(folder => folder.collectionId === colId)
                    .map(folder => folder._id);

                  setSelectedFolders(prevFolders =>
                    prevFolders.filter(folderId => !foldersToRemove.includes(folderId))
                  );
                });
              }
            }}
            label="Collections"
            placeholder="Select collections..."
            isDisabled={loadingCollections}
          />
        </div>
      )}

      {selectedOrgs.length > 0 && selectedCols.length > 0 && (
        <div className="my-2 max-h-56 overflow-y-auto">
          <MultiSelectDropdown
            options={folders
              .filter(f => {
                // Normalize IDs for comparison
                const folderCollectionId = f.collectionId ? (typeof f.collectionId === 'string' ? f.collectionId : String(f.collectionId)) : '';
                return selectedCols.some(colId => {
                  const normalizedColId = typeof colId === 'string' ? colId : String(colId);
                  return folderCollectionId === normalizedColId;
                });
              })
              .map(f => {
                const collectionName = collections.find(c => {
                  const cId = typeof c._id === 'string' ? c._id : String(c._id);
                  const fColId = f.collectionId ? (typeof f.collectionId === 'string' ? f.collectionId : String(f.collectionId)) : '';
                  return cId === fColId;
                })?.name || '';
                return { value: f._id, label: `${f.name}${collectionName ? ` (${collectionName})` : ''}` };
              })}
            value={selectedFolds}
            onChange={isEdit ? setEditSelectedFolders : setSelectedFolders}
            label="Folders"
            placeholder={folders.length === 0 ? "Loading folders..." : selectedCols.length === 0 ? "Select collections first" : "Select folders..."}
            isDisabled={loadingFolders || folders.length === 0}
          />
        </div>
      )}

      {(selectedOrgs.length > 0 || selectedCols.length > 0 || selectedFolds.length > 0) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
          <h4 className="font-medium text-sm mb-2">Access Summary:</h4>
          <div className="text-sm space-y-1">
            {selectedOrgs.length > 0 && (
              <div>• Organizations: {selectedOrgs.length} selected</div>
            )}
            {selectedCols.length > 0 && (
              <div>• Collections: {selectedCols.length} selected</div>
            )}
            {selectedFolds.length > 0 && (
              <div>• Folders: {selectedFolds.length} selected</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout title="Users">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Users">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground">Manage company users and permissions</p>
          </div>
          <div className="grid grid-cols-1 gap-2 w-full sm:w-auto sm:flex sm:flex-row sm:gap-2">
            <Button
              className="w-full sm:w-auto"
              size="sm"
              onClick={() => setIsManageOrgDialogOpen(true)}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Manage Organization
            </Button>
            <Button
              className="w-full sm:w-auto"
              size="sm"
              onClick={() => setIsManageCollectionDialogOpen(true)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Manage Collection
            </Button>
            <Button
              className="w-full sm:w-auto"
              size="sm"
              onClick={() => setIsManageFolderDialogOpen(true)}
            >
              <FolderTree className="mr-2 h-4 w-4" />
              Manage Folder
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Basic Information</h3>
                      <div>
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          required
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="Enter username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password *</Label>
                        <div className="flex gap-2 items-center">
                          <div className="relative w-full">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              required
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Enter password"
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={togglePasswordVisibility}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPasswordGeneratorOpen(true)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {renderPermissionSection(
                      false,
                      selectedOrganizations,
                      selectedCollections,
                      selectedFolders,
                      expandedCollections,
                      handleOrganizationToggle,
                      handleCollectionToggle,
                      handleFolderToggle,
                      handleSelectAllFoldersInCollection,
                      toggleCollectionExpansion
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!selectedOrganizations.length || !formData.username || !formData.email || !formData.password}
                    >
                      Create User
                    </Button>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit User - {editingUser?.username}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>
                  <div>
                    <Label htmlFor="edit-username">Username *</Label>
                    <Input
                      id="edit-username"
                      required
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                    <div className="flex gap-2 items-center">
                      <div className="relative w-full">
                        <Input
                          id="edit-password"
                          type={showEditPassword ? "text" : "password"}
                          value={editFormData.password}
                          onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                          placeholder="Enter new password (optional)"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={toggleEditPasswordVisibility}
                        >
                          {showEditPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditPasswordGeneratorOpen(true)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {renderPermissionSection(
                  true,
                  editSelectedOrganizations,
                  editSelectedCollections,
                  editSelectedFolders,
                  editExpandedCollections,
                  handleEditOrganizationToggle,
                  handleEditCollectionToggle,
                  handleEditFolderToggle,
                  handleEditSelectAllFoldersInCollection,
                  toggleEditCollectionExpansion
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!editSelectedOrganizations.length || !editFormData.username || !editFormData.email}
                >
                  Update User
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search users..." />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              All Users ({totalUsers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                      S.No
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Username</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Role</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user._id} className="border-b border-border">
                      <td className="p-4 align-middle">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </td>
                      <td className="p-4 text-sm font-medium">{user.username}</td>
                      <td className="p-4 text-sm">{user.email}</td>
                      <td className="p-4 text-sm capitalize">{user.role?.replace('_', ' ')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${user.isActive ? 'bg-[#8C47D1]' : 'bg-gray-300'
                              }`}
                            onClick={() => handleStatusToggle(user._id, !user.isActive)}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </div>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(user._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Organization Dialog */}
        <Dialog open={isManageOrgDialogOpen} onOpenChange={setIsManageOrgDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] w-[90vw] p-0">
            <ScrollArea className="max-h-[90vh] pr-4 [&>[data-radix-scroll-area-scrollbar]]:bg-primary/20 [&>[data-radix-scroll-area-scrollbar-thumb]]:bg-primary/50">
              <div className="p-6">
                <OrganizationsContent />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Manage Collection Dialog */}
        <Dialog open={isManageCollectionDialogOpen} onOpenChange={setIsManageCollectionDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] w-[90vw] p-0">
            <ScrollArea className="max-h-[90vh] pr-4 [&>[data-radix-scroll-area-scrollbar]]:bg-primary/20 [&>[data-radix-scroll-area-scrollbar-thumb]]:bg-primary/50">
              <div className="p-6">
                <CollectionsContent />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Manage Folder Dialog */}
        <Dialog open={isManageFolderDialogOpen} onOpenChange={setIsManageFolderDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] w-[90vw] p-0">
            <ScrollArea className="max-h-[90vh] pr-4 [&>[data-radix-scroll-area-scrollbar]]:bg-primary/20 [&>[data-radix-scroll-area-scrollbar-thumb]]:bg-primary/50">
              <div className="p-6">
                <FoldersContent />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalUsers}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>

      {/* Password Generator for Create Form */}
      <PasswordGenerator
        open={isPasswordGeneratorOpen}
        onOpenChange={setIsPasswordGeneratorOpen}
        onPasswordGenerated={handleGeneratedPassword}
      />

      {/* Password Generator for Edit Form */}
      <PasswordGenerator
        open={isEditPasswordGeneratorOpen}
        onOpenChange={setIsEditPasswordGeneratorOpen}
        onPasswordGenerated={handleEditGeneratedPassword}
      />
    </DashboardLayout>
  );
};

export default Users;
