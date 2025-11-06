import { PackageOpen } from 'lucide-react';

interface SimplePageProps {
  title: string;
  description: string;
  icon?: React.ElementType;
}

export default function SimplePage({ title, description, icon: Icon }: SimplePageProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
        {Icon && <Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />}
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600">{description}</p>
        <p className="text-sm text-slate-500 mt-4">This feature is coming soon</p>
      </div>
    </div>
  );
}
