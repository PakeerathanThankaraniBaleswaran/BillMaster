import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function DataTable({ columns, rows, rowKey }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows

    const accessor = col.sortValue || ((r) => r?.[sort.key])

    const next = [...rows].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)

      if (av == null && bv == null) return 0
      if (av == null) return -1
      if (bv == null) return 1

      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    })

    return sort.dir === 'asc' ? next : next.reverse()
  }, [rows, sort, columns])

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' }
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    })
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {columns.map((col) => {
              const sortable = col.sortable
              const active = sort.key === col.key
              return (
                <th
                  key={col.key}
                  className={
                    (col.align === 'right' ? 'text-right' : 'text-left') +
                    ' px-4 py-3 font-semibold'
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      {col.header}
                      {active ? (
                        sort.dir === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, idx) => (
            <tr
              key={rowKey ? rowKey(row) : row._id || idx}
              className={
                'border-t border-gray-100 hover:bg-gray-50 ' +
                (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')
              }
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={
                    (col.align === 'right' ? 'text-right' : 'text-left') +
                    ' px-4 py-3 text-gray-800'
                  }
                >
                  {col.render ? col.render(row) : row?.[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
