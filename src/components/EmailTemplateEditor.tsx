import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2, Eye, Code, RotateCcw } from 'lucide-react';

type TemplateName = 'order_confirmation' | 'admin_order_reminder';

interface TemplateTab {
  name: TemplateName;
  label: string;
  description: string;
  defaultHtml: string;
}

const DEFAULT_ORDER_CONFIRMATION_TEMPLATE = `<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
      .container { background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 600px; margin: 20px auto; }
      h1 { color: #5a3e36; font-size: 24px; margin-top: 0; }
      p { line-height: 1.6; margin-bottom: 15px; }
      .order-details { margin-top: 20px; margin-bottom: 20px; }
      .order-details strong { display: inline-block; width: 120px; }
      .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; }
      .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      .items-table th { background-color: #f8f8f8; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Thank you for your order, {{customer_name}}!</h1>
      <p>We're excited to prepare your delicious treats. Your order has been confirmed.</p>
      <div class="order-details">
        <p><strong>Order Number:</strong> #{{ORDER_NUMBER}}</p>
        <p><strong>Order Date:</strong> {{order_date}}</p>
        <p><strong>Order Total:</strong> {{order_total}}</p>
        <p><strong>Phone:</strong> {{customer_phone}}</p>
      </div>
      <h2 style="font-size: 20px; color: #5a3e36; margin-top: 30px;">Order Summary:</h2>
      {{order_items_table}}
      <p>We'll notify you again once your order is out for delivery or ready for pickup.</p>
      <div class="footer">
        <p>Thanks for choosing Sugar Mama Cookie Co!</p>
        <p>Sugar Mama Cookie Co | Albury-Wodonga, Australia</p>
      </div>
    </div>
  </body>
</html>`;

const DEFAULT_ADMIN_REMINDER_TEMPLATE = `<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
      .container { background-color: #fff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 20px auto; }
      h1 { color: #d97706; font-size: 22px; margin-top: 0; }
      p { line-height: 1.6; }
      .details { background: #fffbeb; padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Order Requires Attention</h1>
      <div class="details">
        <p><strong>Order:</strong> #{{order_id}}</p>
        <p><strong>Customer:</strong> {{customer_name}} ({{customer_email}})</p>
        <p><strong>Date:</strong> {{order_date}}</p>
        <p><strong>Total:</strong> {{order_total}}</p>
      </div>
      <p>This order has not been acknowledged. Please review and update its status.</p>
      {{order_items_table}}
    </div>
  </body>
</html>`;

const TEMPLATE_TABS: TemplateTab[] = [
  {
    name: 'order_confirmation',
    label: 'Order Confirmation',
    description: 'Sent to customers when their order is confirmed.',
    defaultHtml: DEFAULT_ORDER_CONFIRMATION_TEMPLATE,
  },
  {
    name: 'admin_order_reminder',
    label: 'Admin Reminder',
    description: 'Sent to admin when an order needs attention.',
    defaultHtml: DEFAULT_ADMIN_REMINDER_TEMPLATE,
  },
];

const PLACEHOLDERS: Record<TemplateName, string[]> = {
  order_confirmation: [
    '{{customer_name}}',
    '{{ORDER_NUMBER}}',
    '{{order_date}}',
    '{{order_total}}',
    '{{customer_phone}}',
    '{{order_items_table}}',
  ],
  admin_order_reminder: [
    '{{customer_name}}',
    '{{customer_email}}',
    '{{order_id}}',
    '{{order_date}}',
    '{{order_total}}',
    '{{order_items_table}}',
  ],
};

export default function EmailTemplateEditor() {
  const [activeTab, setActiveTab] = useState<TemplateName>('order_confirmation');
  const [templates, setTemplates] = useState<Record<TemplateName, string>>({
    order_confirmation: DEFAULT_ORDER_CONFIRMATION_TEMPLATE,
    admin_order_reminder: DEFAULT_ADMIN_REMINDER_TEMPLATE,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(templates[activeTab]);
        doc.close();
      }
    }
  }, [viewMode, activeTab, templates]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('name, html_content');

    if (!error && data) {
      const loaded = { ...templates };
      data.forEach((row: { name: string; html_content: string }) => {
        if (row.name === 'order_confirmation' || row.name === 'admin_order_reminder') {
          loaded[row.name] = row.html_content;
        }
      });
      setTemplates(loaded);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .upsert(
        { name: activeTab, html_content: templates[activeTab], updated_at: new Date().toISOString() },
        { onConflict: 'name' }
      );
    setSaving(false);
    if (error) {
      toast.error('Failed to save template: ' + error.message);
    } else {
      toast.success('Email template saved');
    }
  };

  const handleReset = () => {
    const tab = TEMPLATE_TABS.find((t) => t.name === activeTab);
    if (tab && window.confirm('Reset this template to its default? Your custom changes will be lost.')) {
      setTemplates((prev) => ({ ...prev, [activeTab]: tab.defaultHtml }));
    }
  };

  const activeTabConfig = TEMPLATE_TABS.find((t) => t.name === activeTab)!;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Customise the HTML email templates used for order notifications. Use the placeholders below to insert dynamic content.
      </p>

      {/* Template selector */}
      <div className="mb-4 flex gap-2">
        {TEMPLATE_TABS.map((tab) => (
          <button
            key={tab.name}
            onClick={() => { setActiveTab(tab.name); setViewMode('editor'); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.name
                ? 'bg-sage-100 text-sage-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-gray-400">{activeTabConfig.description}</p>

      {/* Placeholders */}
      <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <p className="mb-1.5 text-xs font-medium text-gray-500">Available placeholders:</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS[activeTab].map((p) => (
            <code key={p} className="rounded bg-white px-2 py-0.5 text-xs text-sage-700 ring-1 ring-gray-200">
              {p}
            </code>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setViewMode('editor')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === 'editor'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Code className="h-3.5 w-3.5" />
          Editor
        </button>
        <button
          onClick={() => setViewMode('preview')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === 'preview'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
      </div>

      {/* Editor / Preview */}
      {viewMode === 'editor' ? (
        <textarea
          value={templates[activeTab]}
          onChange={(e) =>
            setTemplates((prev) => ({ ...prev, [activeTab]: e.target.value }))
          }
          rows={18}
          className="w-full rounded-lg border-gray-200 font-mono text-xs leading-relaxed text-gray-700 focus:border-sage-500 focus:ring-sage-500"
          spellCheck={false}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <iframe
            ref={iframeRef}
            title="Email Preview"
            className="h-[420px] w-full bg-white"
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save Template'}
        </button>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to Default
        </button>
      </div>
    </div>
  );
}
