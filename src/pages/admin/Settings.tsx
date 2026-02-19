import { useState } from 'react';
import { DollarSign, Mail, Store } from 'lucide-react';
import PricingSettingsPanel from '../../components/PricingSettingsPanel';
import EmailTemplateEditor from '../../components/EmailTemplateEditor';

type Tab = 'pricing' | 'emails' | 'store';

const tabs: { key: Tab; label: string; icon: typeof DollarSign }[] = [
  { key: 'pricing', label: 'Pricing', icon: DollarSign },
  { key: 'emails', label: 'Email Templates', icon: Mail },
  { key: 'store', label: 'Store Info', icon: Store },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('pricing');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Manage pricing, email templates, and store information.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-sage-600 text-sage-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {activeTab === 'pricing' && <PricingSettingsPanel />}
        {activeTab === 'emails' && <EmailTemplateEditor />}
        {activeTab === 'store' && <StoreInfoPanel />}
      </div>
    </div>
  );
}

function StoreInfoPanel() {
  const info = [
    { label: 'Business Name', value: 'Sugar Mama Cookie Co' },
    { label: 'Location', value: 'Albury-Wodonga, Australia' },
    { label: 'Email', value: 'hello@sugarmamacookieco.com.au' },
    { label: 'Website', value: 'sugarmamacookieco.com.au' },
  ];

  return (
    <div className="max-w-lg">
      <p className="mb-6 text-sm text-gray-500">
        Basic store information displayed across the site and in email templates.
      </p>
      <dl className="divide-y divide-gray-100">
        {info.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-3">
            <dt className="text-sm font-medium text-gray-600">{item.label}</dt>
            <dd className="text-sm text-gray-900">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-xs text-gray-400">
        Contact your developer to update store information.
      </p>
    </div>
  );
}
