import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  data: { name: string; orders: number }[];
  title: string;
}

export const PieChart = ({ data, title }: PieChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600">
        No {title.toLowerCase()} data!
      </div>
    );
  }

  const lightColors = [
    "#93c5fd", 
    "#6ee7b7", 
    "#fcd34d", 
    "#fca5a5", 
    "#d8b4fe", 
    "#a5f3fc", 
    "#fbbf24", 
    "#f9a8d4", 
    "#c7d2fe", 
    "#fde68a", 
  ];

  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: data.map((d) => d.orders),
        backgroundColor: lightColors.slice(0, data.length),
        borderWidth: 1,
        borderColor: "#ffffff",
      },
    ],
  };

  return <Pie data={chartData} />;
};
