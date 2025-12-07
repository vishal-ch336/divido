import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BalanceSummary } from '@/types';
import { formatCurrency, getInitials } from '@/lib/format';

interface MemberContributionChartProps {
  balances: BalanceSummary[];
  className?: string;
}

export function MemberContributionChart({ balances, className }: MemberContributionChartProps) {
  const data = useMemo(() => {
    return balances.map(b => ({
      name: b.user.name.split(' ')[0],
      fullName: b.user.name,
      paid: b.totalPaid,
      owed: b.totalOwed,
      net: b.netBalance,
    }));
  }, [balances]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <p className="text-credit">Paid: {formatCurrency(data.paid)}</p>
            <p className="text-muted-foreground">Share: {formatCurrency(data.owed)}</p>
            <p className={data.net >= 0 ? 'text-credit font-medium' : 'text-debit font-medium'}>
              Net: {data.net >= 0 ? '+' : ''}{formatCurrency(data.net)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-muted-foreground">No contribution data</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="paid" 
            radius={[0, 4, 4, 0]}
            fill="hsl(var(--accent))"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
