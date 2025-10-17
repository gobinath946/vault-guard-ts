import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, RefreshCw } from 'lucide-react';
import { passwordService } from '@/services/passwordService';
import { useToast } from '@/hooks/use-toast';

interface PasswordGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordGenerated: (password: string) => void;
}

interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  minNumbers: number;
  minSpecial: number;
  avoidAmbiguous: boolean;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  open,
  onOpenChange,
  onPasswordGenerated,
}) => {
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatorOptions, setGeneratorOptions] = useState<GeneratorOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
    minNumbers: 1,
    minSpecial: 1,
    avoidAmbiguous: false,
  });
  const { toast } = useToast();

  const generatePassword = async () => {
    try {
      const response = await passwordService.generate(generatorOptions);
      setGeneratedPassword(response.data.password);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to generate password',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast({
      title: 'Copied',
      description: 'Password copied to clipboard',
    });
  };

  const usePassword = () => {
    onPasswordGenerated(generatedPassword);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Generator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={generatedPassword}
                readOnly
                placeholder="Generated password will appear here"
                className="font-mono"
              />
            </div>
            <Button size="sm" variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={generatePassword}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label>Length: {generatorOptions.length}</Label>
            <Slider
              value={[generatorOptions.length]}
              onValueChange={(value) => setGeneratorOptions({ ...generatorOptions, length: value[0] })}
              min={8}
              max={128}
              step={1}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use 14 characters or more to generate a strong password.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={generatorOptions.uppercase}
                onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, uppercase: checked as boolean })}
              />
              <Label>A-Z</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={generatorOptions.lowercase}
                onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, lowercase: checked as boolean })}
              />
              <Label>a-z</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={generatorOptions.numbers}
                onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, numbers: checked as boolean })}
              />
              <Label>0-9</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={generatorOptions.special}
                onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, special: checked as boolean })}
              />
              <Label>@#$%&*</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Numbers</Label>
              <Input
                type="number"
                value={generatorOptions.minNumbers}
                onChange={(e) => setGeneratorOptions({ ...generatorOptions, minNumbers: parseInt(e.target.value) })}
                min={0}
                max={10}
              />
            </div>
            <div>
              <Label>Minimum Special</Label>
              <Input
                type="number"
                value={generatorOptions.minSpecial}
                onChange={(e) => setGeneratorOptions({ ...generatorOptions, minSpecial: parseInt(e.target.value) })}
                min={0}
                max={10}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={generatorOptions.avoidAmbiguous}
              onCheckedChange={(checked) => setGeneratorOptions({ ...generatorOptions, avoidAmbiguous: checked as boolean })}
            />
            <Label>Avoid ambiguous characters (1, l, I, 0, O, etc.)</Label>
          </div>

          <Button onClick={generatePassword} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate Password
          </Button>

          {generatedPassword && (
            <Button onClick={usePassword} className="w-full" variant="secondary">
              Use This Password
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordGenerator;