
import React, { useState, useRef, useLayoutEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Check } from 'lucide-react';

export interface OptionType {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: OptionType[];
  value: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  placeholder?: string;
  isDisabled?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select...',
  isDisabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const handleToggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const selectedOptions = options.filter(opt => value.includes(opt.value));

  return (
    <div className="w-full">
      {label && <label className="block mb-2 text-sm font-medium">{label}</label>}
      
      {/* Selected items displayed above the dropdown */}
      {selectedOptions.length > 0 && (
        <div className="mb-2 min-h-[32px] p-2 border border-input rounded-md bg-muted/30 flex flex-wrap gap-1.5">
          {selectedOptions.map(opt => (
            <span key={opt.value} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap shadow-sm">
              <span className="max-w-[180px] truncate">{opt.label}</span>
              <button
                type="button"
                className="hover:bg-primary/80 rounded-full p-0.5 focus:outline-none transition-colors flex-shrink-0"
                onClick={e => {
                  e.stopPropagation();
                  handleToggle(opt.value);
                }}
                tabIndex={-1}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            className="w-full h-10 px-3 py-2 border border-input bg-background text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDisabled}
          >
            <span className="text-muted-foreground text-sm flex-1 text-left">
              {selectedOptions.length > 0 
                ? `${selectedOptions.length} item${selectedOptions.length > 1 ? 's' : ''} selected`
                : placeholder
              }
            </span>
            <span className="flex items-center ml-2 text-muted-foreground flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50"><path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="start" 
          side="bottom"
          sideOffset={4}
          alignOffset={0}
          style={{ width: triggerWidth || undefined, minWidth: 0 }} 
          className="min-w-0 p-0 rounded-md border bg-popover shadow-lg"
        >
          {options.length === 0 && <div className="p-3 text-sm text-muted-foreground text-center">No options</div>}
          <ScrollArea className="max-h-[220px] min-h-[40px] overflow-y-auto">
            <div className="p-1">
              {options.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  className={`flex w-full items-center px-3 py-2 text-sm rounded-md hover:bg-accent focus:bg-accent transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => handleToggle(opt.value)}
                  disabled={isDisabled}
                >
                  <span className="flex-1 text-left truncate">{opt.label}</span>
                  {value.includes(opt.value) && <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MultiSelectDropdown;