import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import Panel from '../components/Panel';
import { Button } from '../../../components/ui/Button';
import { HR_LETTERS } from '../data/hrMockData';

const DOCS = [
  "Corporate Policy Handbook v2026.pdf",
  "Employee Onboarding Pack.zip",
  "Leave Management Policy v3.pdf",
  "Code of Conduct 2026.pdf",
  "Salary Structure Template.xlsx",
  "Q2 Performance Review Template.docx",
];

const DocumentsTab: React.FC = () => {
  return (
    <Panel>
      <div className="text-[15px] font-extrabold text-neutral-800 mb-1">HR Documents & Templates</div>
      <div className="text-xs text-neutral-500 mb-5">Download policies, templates, and corporate letters</div>

      <div className="flex flex-col gap-3">
        {DOCS.map((doc, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5 bg-neutral-50 rounded-[10px] border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-800">{doc}</div>
                <div className="text-[11px] text-neutral-500">HR Department</div>
              </div>
            </div>
            <Button size="sm" onClick={() => alert(`Downloading ${doc}...`)}>
              Download
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-200">
        <div className="text-sm font-extrabold text-neutral-800 mb-4">HR Letter Generator</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {HR_LETTERS.map((letter, i) => (
            <button
              key={i}
              onClick={() => alert(`Generating ${letter}...`)}
              className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg cursor-pointer text-center text-xs font-semibold hover:bg-neutral-100 transition-colors"
            >
              📄 {letter}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
};

export default DocumentsTab;
