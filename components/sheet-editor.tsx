'use client';

import { useState, useCallback, useMemo } from 'react';
import { DataGrid, Column } from 'react-data-grid';
import { parse, unparse } from 'papaparse';
import { useDebounceCallback } from 'usehooks-ts';
import 'react-data-grid/lib/styles.css';

interface SpreadsheetEditorProps {
  content: string;
  saveContent: (content: string, debounce?: boolean) => void;
  status: 'idle' | 'streaming' | 'complete' | 'error';
}

const MIN_ROWS = 50;
const MIN_COLS = 26;

// Generate column letters A, B, C, ... Z, AA, AB, ...
function getColumnLetter(index: number): string {
  let letter = '';
  let num = index;
  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }
  return letter;
}

export function SpreadsheetEditor({
  content,
  saveContent,
  status,
}: SpreadsheetEditorProps) {
  // Parse CSV content
  const parsedData = useMemo(() => {
    if (!content || content.trim() === '') {
      // Create empty grid
      return Array(MIN_ROWS).fill(null).map(() =>
        Array(MIN_COLS).fill('')
      );
    }

    const parsed = parse<string[]>(content, {
      skipEmptyLines: false,
    });

    const data = parsed.data;

    // Pad to minimum dimensions
    const paddedData = [...data];
    while (paddedData.length < MIN_ROWS) {
      paddedData.push(Array(MIN_COLS).fill(''));
    }

    return paddedData.map((row) => {
      const paddedRow = [...row];
      while (paddedRow.length < MIN_COLS) {
        paddedRow.push('');
      }
      return paddedRow;
    });
  }, [content]);

  // Convert 2D array to row objects
  const rows = useMemo(() => {
    return parsedData.map((row, rowIndex) => {
      const rowObj: Record<string, string> = { rowNumber: String(rowIndex + 1) };
      row.forEach((cell, colIndex) => {
        rowObj[getColumnLetter(colIndex)] = cell || '';
      });
      return rowObj;
    });
  }, [parsedData]);

  // Generate columns
  const columns = useMemo((): Column<Record<string, string>>[] => {
    const cols: Column<Record<string, string>>[] = [
      {
        key: 'rowNumber',
        name: '',
        width: 50,
        frozen: true,
        resizable: false,
        renderCell: ({ row }) => (
          <div className="text-center text-gray-500 font-mono text-sm">
            {row.rowNumber}
          </div>
        ),
      },
    ];

    for (let i = 0; i < MIN_COLS; i++) {
      const letter = getColumnLetter(i);
      cols.push({
        key: letter,
        name: letter,
        width: 120,
        resizable: true,
        renderEditCell: (props) => (
          <input
            className="w-full h-full px-2 outline-none"
            value={props.row[letter] || ''}
            onChange={(e) => {
              props.onRowChange({
                ...props.row,
                [letter]: e.target.value,
              });
            }}
            autoFocus
          />
        ),
      });
    }

    return cols;
  }, []);

  // Debounced save handler
  const debouncedSave = useDebounceCallback((updatedRows: Record<string, string>[]) => {
    // Convert back to 2D array
    const dataArray = updatedRows.map((row) => {
      const rowArray: string[] = [];
      for (let i = 0; i < MIN_COLS; i++) {
        rowArray.push(row[getColumnLetter(i)] || '');
      }
      return rowArray;
    });

    // Remove trailing empty rows
    while (
      dataArray.length > 1 &&
      dataArray[dataArray.length - 1].every((cell) => !cell || cell.trim() === '')
    ) {
      dataArray.pop();
    }

    // Convert to CSV
    const csv = unparse(dataArray);
    saveContent(csv, true);
  }, 2000);

  const handleRowsChange = useCallback(
    (updatedRows: Record<string, string>[]) => {
      debouncedSave(updatedRows);
    },
    [debouncedSave]
  );

  return (
    <div className="h-full w-full overflow-auto bg-white">
      <DataGrid
        columns={columns}
        rows={rows}
        onRowsChange={handleRowsChange}
        className="rdg-light h-full"
        style={{ height: '100%' }}
      />
      {status === 'streaming' && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
          Generando...
        </div>
      )}
    </div>
  );
}
