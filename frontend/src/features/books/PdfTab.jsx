import { pdfUrl } from './booksApi.js';
import { ExternalLink, FileDown } from 'lucide-react';

export default function PdfTab({ bookId, book }) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Statement PDF</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generates the formatted Statement of Receipts for {book.code}/{book.bookNumber}.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={pdfUrl(bookId)} target="_blank" rel="noreferrer" className="btn-primary">
            <ExternalLink size={16} /> Open in new tab
          </a>
        </div>
      </div>

      <iframe
        title="Statement PDF preview"
        src={`${pdfUrl(bookId)}?preview=1`}
        className="h-[72vh] w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60"
      />
      <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        <FileDown size={14} className="mr-1 inline" />
        Tip: use the print button in your PDF viewer to save or print.
      </p>
    </div>
  );
}