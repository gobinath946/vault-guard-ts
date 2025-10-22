import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UsernameGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsernameGenerated: (username: string) => void;
}

const UsernameGenerator: React.FC<UsernameGeneratorProps> = ({
  open,
  onOpenChange,
  onUsernameGenerated,
}) => {
  const [generatedUsername, setGeneratedUsername] = useState('');
  const [options, setOptions] = useState({
    type: 'random' as 'random' | 'pattern',
    capitalize: true,
    includeNumber: true,
    pattern: 'first.last',
  });
  const { toast } = useToast();

  const randomWords = [
    'silent', 'quick', 'brave', 'calm', 'witty', 'clever', 'gentle',
    'happy', 'lucky', 'proud', 'bold', 'wise', 'fair', 'true'
  ];

  const generateUsername = () => {
    let username = '';

    if (options.type === 'random') {
      const word1 = randomWords[Math.floor(Math.random() * randomWords.length)];
      const word2 = randomWords[Math.floor(Math.random() * randomWords.length)];
      
      username = options.capitalize 
        ? `${word1.charAt(0).toUpperCase() + word1.slice(1)}${word2.charAt(0).toUpperCase() + word2.slice(1)}`
        : `${word1}${word2}`;
    } else {
      // Pattern-based generation
      username = options.pattern.replace('first', 'john').replace('last', 'doe');
    }

    if (options.includeNumber) {
      username += Math.floor(Math.random() * 1000);
    }

    setGeneratedUsername(username);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUsername);
    toast({
      title: 'Copied',
      description: 'Username copied to clipboard',
    });
  };

  const useUsername = () => {
    onUsernameGenerated(generatedUsername);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Username Generator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={generatedUsername}
                readOnly
                placeholder="Generated username will appear here"
              />
            </div>
            <Button size="sm" variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={generateUsername}>
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={options.type === 'random'}
                    onChange={() => setOptions({ ...options, type: 'random' })}
                  />
                  <span>Random word</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={options.type === 'pattern'}
                    onChange={() => setOptions({ ...options, type: 'pattern' })}
                  />
                  <span>Pattern</span>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={options.capitalize}
                onCheckedChange={(checked) => setOptions({ ...options, capitalize: checked as boolean })}
              />
              <Label>Capitalize</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={options.includeNumber}
                onCheckedChange={(checked) => setOptions({ ...options, includeNumber: checked as boolean })}
              />
              <Label>Include number</Label>
            </div>
          </div>

          <Button onClick={generateUsername} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Username
          </Button>

          {generatedUsername && (
            <Button onClick={useUsername} className="w-full" variant="secondary">
              Use This Username
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameGenerator;