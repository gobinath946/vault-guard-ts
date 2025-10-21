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

  // Generate page options for the dropdown
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between w-full px-4 py-3 bg-white border-t gap-4">
      {/* Left: Rows per page selector */}
      <div className="flex items-center space-x-2 min-w-[160px]">
        <span className="text-sm text-gray-600">Rows:</span>
        <Select
          value={rowsPerPage.toString()}
          onValueChange={(value) => onRowsPerPageChange?.(parseInt(value))}
        >
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rowsPerPageOptions.map((option) => (
              <SelectItem key={option} value={option.toString()}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Center: Page navigation */}
      <UIPagination className="m-0 flex justify-center flex-1">
        <PaginationContent className="flex items-center space-x-5">
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={
                currentPage === 1
                  ? 'pointer-events-none opacity-50 h-8 w-8'
                  : 'cursor-pointer h-8 w-8'
              }
            />
          </PaginationItem>

          {/* Page numbers with ellipsis */}
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
                    className="cursor-pointer h-8 w-8"
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
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return null;
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={
                currentPage === totalPages
                  ? 'pointer-events-none opacity-50 h-8 w-8'
                  : 'cursor-pointer h-8 w-8'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </UIPagination>

      {/* Right: Goto + Total */}
      <div className="flex items-center space-x-4  min-w-[180px] justify-end">
        {/* Goto page selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Goto:</span>
          <Select
            value={currentPage.toString()}
            onValueChange={(value) => onPageChange(parseInt(value))}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageOptions.map((page) => (
                <SelectItem key={page} value={page.toString()}>
                  {page}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Total pages display */}
        <div className="text-sm text-gray-600">
          Total: {totalItems}
        </div>
      </div>
    </div>
  );
};