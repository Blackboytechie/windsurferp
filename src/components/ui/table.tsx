import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<HTMLTableElement, React.HTMLProps<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    return (
      <table
        ref={ref}
        className={cn("min-w-full divide-y divide-gray-200", className)}
        {...props}
      />
    )
  }
)
Table.displayName = "Table"

const TableHeader = ({ className, ...props }: React.HTMLProps<HTMLTableSectionElement>) => {
  return <thead className={cn("bg-gray-50", className)} {...props} />
}

const TableBody = ({ className, ...props }: React.HTMLProps<HTMLTableSectionElement>) => {
  return <tbody className={cn("bg-white divide-y divide-gray-200", className)} {...props} />
}

const TableRow = ({ className, ...props }: React.HTMLProps<HTMLTableRowElement>) => {
  return <tr className={cn("hover:bg-gray-100", className)} {...props} />
}

const TableHead = ({ className, ...props }: React.HTMLProps<HTMLTableCellElement>) => {
  return <th className={cn("px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", className)} {...props} />
}

const TableCell = ({ className, ...props }: React.HTMLProps<HTMLTableCellElement>) => {
  return <td className={cn("px-6 py-4 whitespace-nowrap text-sm text-gray-900", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
