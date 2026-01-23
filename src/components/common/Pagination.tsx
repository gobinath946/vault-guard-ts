import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rows: number) => void;
  rowsPerPageOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 20, 50, 100],
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between w-full px-6 py-3 bg-white gap-4 border-t border-border/40">
      {/* Left: Checkbox style label + Page size */}
      <div className="flex items-center gap-6 min-w-fit">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-[#6344E8] flex items-center justify-center shadow-sm">
            <Check className="h-3 w-3 text-white stroke-[3px]" />
          </div>
          <span className="text-xs font-semibold text-slate-600">Pagination</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Rows:</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={(value) => onRowsPerPageChange?.(parseInt(value))}
          >
            <SelectTrigger className="w-[70px] h-8 text-xs border-slate-200 bg-slate-50 rounded-lg hover:border-[#6344E8]/30 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rowsPerPageOptions.map((option) => (
                <SelectItem key={option} value={option.toString()} className="text-xs">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Center: Navigation controls */}
      <div className="flex items-center justify-center flex-1">
        <UIPagination className="m-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={cn(
                  "h-8 px-2 text-xs transition-all rounded-lg",
                  currentPage === 1
                    ? 'pointer-events-none opacity-40'
                    : 'cursor-pointer hover:bg-slate-100 hover:text-[#6344E8]'
                )}
              />
            </PaginationItem>

            {pages.map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1) ||
                totalPages <= 7
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => onPageChange(page)}
                      isActive={page === currentPage}
                      className={cn(
                        "h-8 w-8 text-xs font-medium transition-all rounded-lg",
                        page === currentPage
                          ? 'bg-[#6344E8] text-white shadow-lg shadow-[#6344E8]/20 hover:bg-[#5235d1]'
                          : 'cursor-pointer hover:bg-slate-100 text-slate-600'
                      )}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (
                (page === currentPage - 2 && currentPage > 3) ||
                (page === currentPage + 2 && currentPage < totalPages - 2)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis className="h-3 w-3" />
                  </PaginationItem>
                );
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={cn(
                  "h-8 px-2 text-xs transition-all rounded-lg",
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-40'
                    : 'cursor-pointer hover:bg-slate-100 hover:text-[#6344E8]'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </UIPagination>
      </div>

      {/* Right: Go to + Total Items */}
      <div className="flex items-center gap-6 min-w-fit justify-end">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Go to:</span>
          <Select
            value={currentPage.toString()}
            onValueChange={(value) => onPageChange(parseInt(value))}
          >
            <SelectTrigger className="w-[60px] h-8 text-xs border-slate-200 bg-slate-50 rounded-lg hover:border-[#6344E8]/30 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageOptions.map((page) => (
                <SelectItem key={page} value={page.toString()} className="text-xs">
                  {page}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">
          Total: <span className="text-[#1A1A1A]">{totalItems}</span>
        </div>
      </div>
    </div>
  );
};