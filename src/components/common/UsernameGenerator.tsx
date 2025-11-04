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
import { faker } from '@faker-js/faker';

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
    type: 'random' as 'random' | 'pattern' | 'adjective-animal',
    capitalize: true,
    includeNumber: true,
    pattern: 'first.last',
  });
  const { toast } = useToast();

  const generateUsername = () => {
    let username = '';

    if (options.type === 'random') {
      // Random combination of adjective and noun
      const adjective = faker.word.adjective();
      const noun = faker.word.noun();
      
      username = options.capitalize 
        ? `${adjective.charAt(0).toUpperCase() + adjective.slice(1)}${noun.charAt(0).toUpperCase() + noun.slice(1)}`
        : `${adjective}${noun}`;
    } else if (options.type === 'adjective-animal') {
      // Adjective + Animal combination
      const adjective = faker.word.adjective();
      const animal = faker.animal.type();
      
      username = options.capitalize 
        ? `${adjective.charAt(0).toUpperCase() + adjective.slice(1)}${animal.charAt(0).toUpperCase() + animal.slice(1)}`
        : `${adjective}${animal}`;
    } else {
      // Pattern-based generation using faker names
      const firstName = faker.person.firstName().toLowerCase();
      const lastName = faker.person.lastName().toLowerCase();
      
      username = options.pattern
        .replace('first', firstName)
        .replace('last', lastName);
      
      if (options.capitalize) {
        username = username.split(/([._-])/).map((part, i) => 
          i % 2 === 0 && part.length > 0 
            ? part.charAt(0).toUpperCase() + part.slice(1) 
            : part
        ).join('');
      }
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
            <Button size="sm" variant="outline" onClick={copyToClipboard} disabled={!generatedUsername}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={generateUsername}>
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={options.type === 'random'}
                    onChange={() => setOptions({ ...options, type: 'random' })}
                  />
                  <span>Random Words</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={options.type === 'adjective-animal'}
                    onChange={() => setOptions({ ...options, type: 'adjective-animal' })}
                  />
                  <span>Adjective + Animal</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={options.type === 'pattern'}
                    onChange={() => setOptions({ ...options, type: 'pattern' })}
                  />
                  <span>Name Pattern</span>
                </label>
              </div>
            </div>

            {options.type === 'pattern' && (
              <div>
                <Label>Pattern</Label>
                <Input
                  value={options.pattern}
                  onChange={(e) => setOptions({ ...options, pattern: e.target.value })}
                  placeholder="e.g., first.last, first_last"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Use 'first' and 'last' as placeholders</p>
              </div>
            )}

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