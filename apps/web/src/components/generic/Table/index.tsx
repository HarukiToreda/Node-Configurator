import { cn } from "@core/utils/cn.ts";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import React, { useMemo, useState } from "react";

export interface Heading {
  title: string;
  sortable: boolean;
}

interface Cell {
  content: React.ReactNode;
  sortValue: string | number;
}

export interface DataRow {
  id: string | number;
  isFavorite?: boolean;
  cells: Cell[];
}

export interface TableProps {
  headings: Heading[];
  rows: DataRow[];
  compact?: boolean;
  initialSortColumn?: string | null;
  showColumnDividers?: boolean;
}

export const Table = ({
  headings,
  rows,
  compact = false,
  initialSortColumn = "Last Heard",
  showColumnDividers = false,
}: TableProps) => {
  const [sortColumn, setSortColumn] = useState<string | null>(
    initialSortColumn,
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (title: string) => {
    if (sortColumn === title) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(title);
      setSortOrder("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortColumn) {
      return rows;
    }

    const columnIndex = headings.findIndex((h) => h.title === sortColumn);
    if (columnIndex === -1) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }

      const aCell = a.cells[columnIndex];
      const bCell = b.cells[columnIndex];
      if (!aCell || !bCell) return 0;

      const aValue = aCell.sortValue;
      const bValue = bCell.sortValue;

      if (aValue < bValue) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [rows, sortColumn, sortOrder, headings]);

  return (
    <table
      className="min-w-full border-separate border-spacing-0"
      style={{ contentVisibility: "auto" }}
    >
      <thead className="text-xs font-semibold">
        <tr>
          {headings.map((heading, headingIndex) => (
            <th
              key={heading.title}
              scope="col"
              className={cn(
                compact ? "px-2 py-1.5 text-left" : "py-2 pr-3 text-left",
                showColumnDividers &&
                  headingIndex < headings.length - 1 &&
                  "border-r border-slate-300/70 dark:border-slate-700/80",
                heading.sortable &&
                  "cursor-pointer hover:brightness-hover active:brightness-press",
              )}
              onClick={() => heading.sortable && handleSort(heading.title)}
              onKeyUp={(e) => {
                if (heading.sortable && (e.key === "Enter" || e.key === " ")) {
                  handleSort(heading.title);
                }
              }}
              tabIndex={heading.sortable ? 0 : -1}
              aria-sort={
                sortColumn === heading.title
                  ? sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <div className="flex items-center gap-2">
                {heading.title}
                {heading.sortable &&
                  sortColumn === heading.title &&
                  (sortOrder === "asc" ? (
                    <ChevronUpIcon size={16} aria-hidden="true" />
                  ) : (
                    <ChevronDownIcon size={16} aria-hidden="true" />
                  ))}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-w-fit">
        {sortedRows.map((row) => (
          <tr
            key={row.id}
            className={cn(
              row.isFavorite
                ? "bg-yellow-100/30 dark:bg-slate-800 odd:bg-yellow-200/30 dark:odd:bg-slate-600/40"
                : "bg-white dark:bg-slate-900 odd:bg-slate-200/40 dark:odd:bg-slate-800/40",
            )}
          >
            {row.cells.map((cell, cellIndex) => {
              const key = `${row.id}_${cellIndex}`;
              const isFirstCell = cellIndex === 0;
              const sharedCellClassName = cn(
                "whitespace-nowrap text-text-secondary",
                compact ? "px-2 py-1.5 text-[13px]" : "px-3 py-2 text-sm",
                showColumnDividers &&
                  cellIndex < row.cells.length - 1 &&
                  "border-r border-slate-300/60 dark:border-slate-700/70",
              );

              const cellElement = isFirstCell ? (
                <th
                  className={cn(sharedCellClassName, "text-left")}
                  scope="row"
                >
                  {cell.content}
                </th>
              ) : (
                <td className={sharedCellClassName}>{cell.content}</td>
              );

              return React.cloneElement(cellElement, { key });
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
