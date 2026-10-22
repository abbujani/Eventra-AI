import { cn } from '../../lib/cn.js';

export interface ChartDatum {
  name: string;
  value: number;
}

const PALETTE = ['#7657E8', '#F5A7B8', '#20876A', '#E8A33D', '#4A7BE8', '#B057E8', '#74748A', '#E86A57'];

export function paletteColor(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

function ChartTable({ data, total }: { data: ChartDatum[]; total: number }) {
  return (
    <table className="sr-only">
      <caption>Budget breakdown by category</caption>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">Amount</th>
          <th scope="col">Share</th>
        </tr>
      </thead>
      <tbody>
        {data.map((datum, index) => (
          <tr key={`${datum.name}-${index}`}>
            <th scope="row">{datum.name}</th>
            <td>{datum.value}</td>
            <td>{total > 0 ? `${((datum.value / total) * 100).toFixed(1)}%` : '0%'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Accessible donut chart with an equivalent data table for screen readers. */
export function DonutChart({
  data,
  size = 168,
  thickness = 26,
  centerLabel,
  centerValue,
  className,
}: {
  data: ChartDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = data.map((datum, index) => {
    const fraction = total > 0 ? Math.max(0, datum.value) / total : 0;
    const length = fraction * circumference;
    const segment = {
      ...datum,
      dash: `${length} ${circumference - length}`,
      offset: -offset,
      color: paletteColor(index),
    };
    offset += length;
    return segment;
  });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-5">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Budget breakdown: ${total} total across ${data.length} categories`}
          className="shrink-0"
        >
          <g transform={`rotate(-90 ${center} ${center})`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(23,21,43,0.08)"
              strokeWidth={thickness}
            />
            {segments.map((segment, index) => (
              <circle
                key={`${segment.name}-${index}`}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={segment.dash}
                strokeDashoffset={segment.offset}
              />
            ))}
          </g>
          {centerValue && (
            <text x={center} y={center - 2} textAnchor="middle" className="fill-midnight text-lg font-bold">
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text x={center} y={center + 16} textAnchor="middle" className="fill-slate text-[0.65rem]">
              {centerLabel}
            </text>
          )}
        </svg>
        <ul className="flex flex-col gap-1.5 text-sm">
          {data.map((datum, index) => (
            <li key={`${datum.name}-${index}`} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: paletteColor(index) }}
                aria-hidden="true"
              />
              <span className="text-midnight-2">{datum.name}</span>
              <span className="font-semibold text-midnight">
                {total > 0 ? `${((datum.value / total) * 100).toFixed(0)}%` : '0%'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <ChartTable data={data} total={total} />
    </div>
  );
}

/** Accessible horizontal bar chart with an equivalent data table. */
export function BarChart({
  data,
  formatValue,
  className,
}: {
  data: ChartDatum[];
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((datum) => Math.max(0, datum.value)));

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-2.5">
        {data.map((datum, index) => (
          <div key={`${datum.name}-${index}`} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3">
            <span className="truncate text-sm text-midnight-2" title={datum.name}>
              {datum.name}
            </span>
            <div className="h-3 w-full overflow-hidden rounded-full bg-midnight/8">
              <div
                className="h-full rounded-full"
                style={{ width: `${(Math.max(0, datum.value) / max) * 100}%`, backgroundColor: paletteColor(index) }}
              />
            </div>
            <span className="text-right text-sm font-semibold text-midnight">
              {formatValue ? formatValue(datum.value) : datum.value}
            </span>
          </div>
        ))}
      </div>
      <ChartTable data={data} total={data.reduce((sum, d) => sum + Math.max(0, d.value), 0)} />
    </div>
  );
}
