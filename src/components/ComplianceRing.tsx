import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function ComplianceRing({ score = 85 }: { score?: number }) {
  const data = [
    { name: 'Conforme', value: score },
    { name: 'Non Conforme', value: 100 - score },
  ];
  const COLORS = ['#16a34a', '#dc2626'];

  return (
    <div className="h-40 w-full relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">
        {score}%
      </div>
    </div>
  );
}
