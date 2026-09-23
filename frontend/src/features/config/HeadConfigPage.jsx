import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, Eye, EyeOff, FileText, Save } from 'lucide-react';
import { useVisibleHeads } from './useVisibleHeads.js';
import { setHeadVisible, fetchPdfConfig, updatePdfConfig } from './configApi.js';
import { PageLoader, Spinner } from '../../components/ui/Spinner.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';
import { getErrorMessage } from '../../lib/api.js';

export default function HeadConfigPage() {
  const queryClient = useQueryClient();
  const { heads, isLoading, error } = useVisibleHeads();

  const visibilityMutation = useMutation({
    mutationFn: ({ head, visible }) => setHeadVisible(head, visible),
    onSuccess: data => {
      queryClient.setQueryData(['head-config'], data);
      queryClient.invalidateQueries({ queryKey: ['pdf-config'] });
    },
    onError: () => {},
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorAlert message={getErrorMessage(error)} />;

  const visibleCount = heads.filter(h => h.visible).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          <Settings2 size={24} className="text-brand-700 dark:text-brand-300" /> Configuration
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage which heads are shown and how the statement PDF is laid out. Sessional heads can be switched off — they are hidden from the entry screen, summaries and the statement PDF everywhere.
        </p>
      </div>

      <VisibilitySection heads={heads} mutation={visibilityMutation} />

      <PdfLayoutSection />

      <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
        Tip: switching a head off only hides it from new entry selection and reports. Existing entries already recorded are kept as-is.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function VisibilitySection({ heads, mutation }) {
  const visibleCount = heads.filter(h => h.visible).length;

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Visible heads</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Heads shown on the entry screen, summaries, dashboard and PDF.</p>
        </div>
        <span className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
          {visibleCount} of {heads.length} visible
        </span>
      </div>

      <div className="card divide-y divide-slate-100 p-2 dark:divide-slate-800">
        {heads.map(h => (
          <div key={h.head} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${h.visible ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                {h.visible ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{h.label}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {h.visible ? 'Visible — selectable in entries and reports' : 'Hidden everywhere — sessional head'}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={h.visible}
              aria-label={`Toggle ${h.label}`}
              onClick={() => {
                if (mutation.isPending) return;
                mutation.mutate({ head: h.head, visible: !h.visible });
              }}
              disabled={mutation.isPending}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                h.visible ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  h.visible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      {mutation.isPending && (
        <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">Saving…</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
function PdfLayoutSection() {
  const queryClient = useQueryClient();
  const { visibleHeads } = useVisibleHeads();

  const { data: pdfCfg, isLoading } = useQuery({
    queryKey: ['pdf-config'],
    queryFn: fetchPdfConfig,
  });

  const [selection, setSelection] = useState(null);
  const [subHeadOn, setSubHeadOn] = useState(null);
  const [row7Val, setRow7Val] = useState(null);
  const [row8Val, setRow8Val] = useState(null);
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: ({ mainHeads, subHeadMode, summaryRow7, summaryRow8 }) =>
      updatePdfConfig(mainHeads, subHeadMode, summaryRow7, summaryRow8),
    onSuccess: data => {
      queryClient.setQueryData(['pdf-config'], data);
      if (data.mainHeads) setSelection([...data.mainHeads]);
      if (typeof data.subHeadMode === 'boolean') setSubHeadOn(data.subHeadMode);
      setRow7Val(data.summaryRow7 ?? null);
      setRow8Val(data.summaryRow8 ?? null);
      setErr('');
    },
    onError: e => setErr(getErrorMessage(e)),
  });

  // Initialise the configuration fields from the stored config.
  if (isLoading) {
    return (
      <div className="card mt-8 p-6">
        <PageLoader />
      </div>
    );
  }

  const storedMains = pdfCfg?.mainHeads ?? [];
  const storedSubMode = typeof pdfCfg?.subHeadMode === 'boolean' ? pdfCfg.subHeadMode : true;
  const subEffective = subHeadOn ?? storedSubMode;
  const effective = selection ?? storedMains;
  const chosen = Array.isArray(effective) ? effective : [];

  // Lock the dropdowns to the right count: 6 slots in sub-head mode (columns
  // 1-5 plus the column-6 title — column 7 is always the Amount column) and 7
  // in main mode. Dropping any leftover 7th head in sub mode stops it hiding a
  // phantom head that duplicates the visible ones and silently rejects saves.
  const slotCount = subEffective ? 6 : 7;
  const padded = [...chosen].slice(0, slotCount);
  while (padded.length < slotCount) {
    const free = visibleHeads.find(v => !padded.includes(v.head))?.head;
    if (!free) break;
    padded.push(free);
  }

  const mainSlots = padded.slice(0, 5);
  const col6Slot = padded[5];
  const col7Slot = padded[6];

  // Other visible heads (beyond the configured slots).
  const extraHeads = visibleHeads.filter(v => !padded.includes(v.head));
  // In sub-head mode every visible head that isn't one of the six configured
  // mains is a sub-head (name in column 6, amount in column 7).
  const subHeads = subEffective
    ? visibleHeads.filter(v => ![...mainSlots, col6Slot].includes(v.head))
    : extraHeads;
  // A head already used in another slot is hidden from a dropdown (its current
  // value stays selectable until the user chooses something else).
  const headOptionsFor = index => {
    const current = padded[index];
    return visibleHeads.filter(v => v.head === current || !padded.includes(v.head));
  };
  const effectiveRow7 = row7Val === undefined ? (pdfCfg?.summaryRow7 ?? null) : row7Val;
  const effectiveRow8 = row8Val === undefined ? (pdfCfg?.summaryRow8 ?? null) : row8Val;

  const dirty =
    JSON.stringify(chosen.slice(0, slotCount)) !== JSON.stringify(storedMains.slice(0, slotCount)) ||
    subEffective !== storedSubMode ||
    effectiveRow7 !== (pdfCfg?.summaryRow7 ?? null) ||
    effectiveRow8 !== (pdfCfg?.summaryRow8 ?? null);

  const updateSlot = (index, head) => {
    const next = [...padded];
    if (head === '') next.splice(index, 1); // remove → list shrinks
    else next[index] = head;
    setSelection(next.slice(0, slotCount));
    setErr('');
  };

  // Toggling sub-head mode persists immediately — like the visibility switches —
  // so the PDF and a later page visit reflect the chosen mode. The current slot
  // arrangement is saved as-is; any unsaved slot edits are included.
  const toggleMode = () => {
    const final = padded.filter(Boolean);
    if (final.length < 6 || new Set(final).size !== final.length) {
      setErr('Assign 6 distinct heads at minimum — one per column.');
      return;
    }
    mutation.mutate({
      mainHeads: final,
      subHeadMode: !subEffective,
      summaryRow7: effectiveRow7,
      summaryRow8: effectiveRow8,
    });
  };

  const save = () => {
    const final = padded.filter(Boolean);
    if (final.length < 6 || new Set(final).size !== final.length) {
      setErr('Assign 6 distinct heads at minimum — one per column.');
      return;
    }
    mutation.mutate({
      mainHeads: final,
      subHeadMode: subEffective,
      summaryRow7: effectiveRow7,
      summaryRow8: effectiveRow8,
    });
  };

  return (
    <div className="card mt-8 p-6">
      <div className="mb-1 flex items-center gap-2">
        <FileText size={18} className="text-brand-700 dark:text-brand-300" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Statement PDF layout</h2>
      </div>
      <p className="mb-5 text-xs text-slate-400 dark:text-slate-500">
        Seven main head slots. When more visible heads exist than these slots, column 6 lists every extra head as a <b>sub-head</b> under its title and column 7 holds their <b>Amount</b>. When there are no sub-heads, columns 6 and 7 print as normal main heads.
      </p>

      {err && <div className="mb-4"><ErrorAlert message={err} /></div>}

      <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sub-head mode</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {subEffective
              ? 'ON — column 6 lists sub-heads under its title, column 7 holds their Amount.'
              : 'OFF — columns 6 and 7 print as normal main head columns.'}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={subEffective}
          aria-label="Toggle sub-head mode"
          onClick={toggleMode}
          disabled={mutation.isPending}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            subEffective ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              subEffective ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {mainSlots.map((h, i) => (
          <label key={`c${i}`} className="block">
            <span className="label">Column {i + 1}</span>
            <select
              value={h}
              onChange={e => updateSlot(i, e.target.value)}
              className="input"
            >
              {headOptionsFor(i).map(v => (
                <option key={v.head} value={v.head}>{v.label}</option>
              ))}
            </select>
          </label>
        ))}
        <label className="block">
          <span className="label">Column 6{subEffective ? ' (sub-head title)' : ''}</span>
          <select value={col6Slot ?? ''} onChange={e => updateSlot(5, e.target.value)} className="input">
            {headOptionsFor(5).map(v => (
              <option key={v.head} value={v.head}>{v.label}</option>
            ))}
          </select>
        </label>
        {subEffective ? (
          <label className="block">
            <span className="label">Column 7</span>
            <div className="input flex items-center bg-slate-50 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Amount</div>
          </label>
        ) : (
          <label className="block">
            <span className="label">Column 7</span>
            <select value={col7Slot ?? ''} onChange={e => updateSlot(6, e.target.value)} className="input">
              {headOptionsFor(6).map(v => (
                <option key={v.head} value={v.head}>{v.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
        {subEffective ? (
          <>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sub-head logic — column 6 titled {col6Label(col6Slot, visibleHeads)}; column 7 = Amount
            </div>
            {subHeads.length ? (
              <div className="flex flex-wrap gap-2">
                {subHeads.map(v => (
                  <span
                    key={v.head}
                    className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                  >
                    {v.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                No extra heads — column 7 stays blank. Add heads beyond these seven (or switch the toggle off).
              </p>
            )}
            {subHeads.length > 0 && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                These heads print their <b>name</b> in column 6 and their amount in column 7.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            <b>Normal mode</b> — sub-head logic off. Columns 6 and 7 print as normal main heads: column 6 = {col6Label(col6Slot, visibleHeads)}, column 7 = {col6Label(col7Slot, visibleHeads)}.
            {subHeads.length > 0 && (
              <>
                {' '}Heads {subHeads.map(v => v.label).join(', ')} will not appear in the statement.
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Summary rows 7 &amp; 8
        </div>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          These two heads print in the fixed 9-row PDF summary (S U M M A R Y → BHETA → B.F. → S.B.F. → S.S + PCS → Langar + FF → rows 7 &amp; 8 → TOTAL Rs.). Pick a head or leave blank for an empty row.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Summary row 7', value: effectiveRow7, set: setRow7Val },
            { label: 'Summary row 8', value: effectiveRow8, set: setRow8Val },
          ].map(({ label, value, set }) => (
            <label key={label} className="block">
              <span className="label">{label}</span>
              <select value={value ?? ''} onChange={e => set(e.target.value || null)} className="input">
                <option value="">— None —</option>
                {visibleHeads.map(v => (
                  <option key={v.head} value={v.head}>{v.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        {dirty && (
          <span className="text-xs text-slate-400 dark:text-slate-500">Unsaved changes</span>
        )}
        <button type="button" onClick={save} disabled={mutation.isPending || !dirty} className="btn-primary">
          {mutation.isPending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : <Save size={16} />} Save layout
        </button>
      </div>
    </div>
  );
}

function col6Label(head, visibleHeads) {
  if (!head) return '—';
  return visibleHeads.find(v => v.head === head)?.label ?? head;
}