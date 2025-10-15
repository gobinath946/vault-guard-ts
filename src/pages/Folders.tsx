import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/common/SearchBar';
import { Plus, Edit, Trash2, FolderTree, Folder as FolderIcon } from 'lucide-react';
import { folderService } from '@/services/folderService';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Folder {
  _id: string;
  folderName: string;
  parentFolderId?: string;
  createdAt: string;
}

const Folders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    folderName: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const data = await folderService.getAll();
      setFolders(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch folders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this folder?')) return;

    try {
      await folderService.delete(id);
      toast({
        title: 'Success',
        description: 'Folder deleted successfully',
      });
      fetchFolders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await folderService.create(formData);
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
      setIsDialogOpen(false);
      setFormData({ folderName: '' });
      fetchFolders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  const filteredFolders = folders.filter((folder) =>
    folder.folderName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Folders">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Folders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Folders</h2>
            <p className="text-muted-foreground">Organize your passwords with folders</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Folder Name</Label>
                  <Input
                    required
                    value={formData.folderName}
                    onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
                    placeholder="e.g., Work Accounts"
                  />
                </div>
                <Button type="submit" className="w-full">Create Folder</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search folders..." />

        {filteredFolders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderTree className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                No folders yet. Create your first folder to organize passwords.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFolders.map((folder) => (
              <Card key={folder._id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderIcon className="h-5 w-5 text-primary" />
                      <span className="text-lg">{folder.folderName}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(folder._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(folder.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Folders;
