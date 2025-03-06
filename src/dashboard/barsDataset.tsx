import { BarChart } from "@mui/x-charts/BarChart";
import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { Typography, Card, CardContent } from "@mui/material";

const chartSetting = {
  yAxis: [
    {
      label: "Sales",
    },
  ],
  width: 800,
  height: 400,
  sx: {
    [`.${axisClasses.left} .${axisClasses.label}`]: {
      transform: "translate(-20px, 0)",
    },
  },
};

interface SeriesItem {
  dataKey: string;
  label: string;
  color?: string;
}

interface BarsDatasetProps {
  data: Array<{ [key: string]: number | string }>;
  xKey: string;
  series: SeriesItem[];
  title?: string;
}

export default function BarsDataset({
  data,
  xKey,
  series,
  title,
}: BarsDatasetProps) {
  return (
    <Card>
      <CardContent>
        {title && (
          <Typography variant="h6" component="h2" gutterBottom>
            {title}
          </Typography>
        )}
        <BarChart
          dataset={data}
          xAxis={[
            {
              scaleType: "band",
              dataKey: xKey,
              tickLabelStyle: {
                angle: 45,
                textAnchor: "start",
                fontSize: 12,
              },
            },
          ]}
          series={series}
          {...chartSetting}
          legend={{
            hidden: false,
          }}
          margin={{
            top: 40,
            right: 40,
            bottom: 60,
            left: 60,
          }}
        />
      </CardContent>
    </Card>
  );
}
