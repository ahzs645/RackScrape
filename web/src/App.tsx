import { useEffect, useMemo, useState } from 'react';
import {
  Line,
  LineChart,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';
import { format, subDays } from 'date-fns';
import { Download, RefreshCw, Server, Clock, Play } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Select } from './components/ui/select';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Label } from './components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import './index.css';

type PricingType = 'daily' | 'weekly-average' | 'twice-weekly-average' | 'intra-day';

interface HistoryRecord {
  effective_date: string;
  location: string;
  pricing_type: PricingType;
  reg_87: number | null;
  mid_89: number | null;
  sup_91: number | null;
  uls_diesel: number | null;
  furnace_oil?: number | null;
  stove?: number | null;
}

interface LatestRecord extends HistoryRecord {
  scrape_id: string;
}

interface RunRow {
  scrape_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  records_count: number;
  error_message?: string | null;
}

interface Stats {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  total_records: number;
  last_run_date: string;
}

interface ScheduleStatus {
  cronExpression: string;
  timezone: string;
  running: boolean;
  updatedAt?: string;
  nextRun?: string | null;
  lastRun?: string | null;
}

const pricingOptions: { label: string; value: PricingType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly Average', value: 'weekly-average' },
  { label: 'Twice-Weekly Average', value: 'twice-weekly-average' },
  { label: 'Intra-Day', value: 'intra-day' }
];

const timeframeOptions = [
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' },
  { label: 'All', value: 'all' }
];

const API_BASE = import.meta.env.VITE_API_BASE || '';

function App() {
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [pricingType, setPricingType] = useState<PricingType>('daily');
  const [timeframe, setTimeframe] = useState<string>('90');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [latest, setLatest] = useState<LatestRecord[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [schedule, setSchedule] = useState<ScheduleStatus | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ cronExpression: '', timezone: '' });
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    fetchJSON<{ locations: string[] }>('/api/locations').then(res => {
      setLocations(res.locations);
      if (!selectedLocation && res.locations.length > 0) {
        setSelectedLocation(res.locations[0]);
      }
    });

    refreshStats();
    refreshRuns();
    fetchSchedule();
  }, []);

  useEffect(() => {
    if (!schedule) return;
    setScheduleForm({
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone
    });
  }, [schedule]);

  useEffect(() => {
    if (!selectedLocation) return;
    refreshLatest();
    refreshHistory();
  }, [selectedLocation, pricingType, timeframe, customStart, customEnd]);

  const chartData = useMemo(() => {
    return history
      .map(item => ({
        date: item.effective_date,
        reg87: toNumber(item.reg_87),
        mid89: toNumber(item.mid_89),
        sup91: toNumber(item.sup_91),
        diesel: toNumber(item.uls_diesel)
      }))
      .reverse();
  }, [history]);

  const latestForLocation = useMemo(() => {
    if (!selectedLocation) return [];
    return latest.filter(item => item.location === selectedLocation);
  }, [latest, selectedLocation]);

  async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
    const resp = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (!resp.ok) {
      throw new Error(await resp.text());
    }

    return resp.json() as Promise<T>;
  }

  async function refreshLatest() {
    try {
      const params = new URLSearchParams();
      if (selectedLocation) params.set('location', selectedLocation);
      if (pricingType) params.set('pricingType', pricingType);
      const res = await fetchJSON<{ data: LatestRecord[] }>(
        `/api/prices/latest?${params.toString()}`
      );
      setLatest(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshHistory() {
    try {
      const params = new URLSearchParams({
        location: selectedLocation,
        pricingType
      });

      const numericWindow = Number.parseInt(timeframe, 10);
      if (timeframe !== 'all' && Number.isFinite(numericWindow)) {
        const start = subDays(new Date(), numericWindow);
        params.set('startDate', format(start, 'yyyy-MM-dd'));
      }

      if (customStart) params.set('startDate', customStart);
      if (customEnd) params.set('endDate', customEnd);

      const res = await fetchJSON<{ data: HistoryRecord[] }>(
        `/api/prices/history?${params.toString()}`
      );
      setHistory(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchSchedule() {
    try {
      const res = await fetchJSON<{ data: ScheduleStatus }>('/api/schedule');
      setSchedule(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshRuns() {
    try {
      const res = await fetchJSON<{ data: RunRow[] }>('/api/runs?limit=10');
      setRuns(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshStats() {
    try {
      const res = await fetchJSON<{ data: Stats }>('/api/runs/stats');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleScheduleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const res = await fetchJSON<{ data: ScheduleStatus }>('/api/schedule', {
        method: 'POST',
        body: JSON.stringify(scheduleForm)
      });
      setSchedule(res.data);
      setStatusMessage('Schedule updated.');
    } catch (error) {
      setStatusMessage('Failed to update schedule');
    }
  }

  async function triggerScrape() {
    setStatusMessage('');
    try {
      await fetchJSON('/api/scrape/run', { method: 'POST' });
      setStatusMessage('Manual scrape started.');
      refreshRuns();
    } catch (error) {
      setStatusMessage('Failed to start scrape.');
    }
  }

  const downloadAllHref = '/api/export/latest';
  const downloadLocationHref = selectedLocation
    ? `/api/export/location?location=${encodeURIComponent(selectedLocation)}&pricingType=${pricingType}`
    : undefined;

  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-slate-500">Petro-Canada Rack Prices</p>
            <h1 className="text-2xl font-semibold text-foreground">RackScrape Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={downloadAllHref}>
                <Download className="mr-2 h-4 w-4" />
                Download latest CSV
              </a>
            </Button>
            {downloadLocationHref && (
              <Button asChild size="sm">
                <a href={downloadLocationHref}>
                  <Download className="mr-2 h-4 w-4" />
                  Download {selectedLocation}
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-6 py-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    id="location"
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                  >
                    {locations.map(loc => (
                      <option value={loc} key={loc}>
                        {loc}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricing">Pricing type</Label>
                  <Select
                    id="pricing"
                    value={pricingType}
                    onChange={e => setPricingType(e.target.value as PricingType)}
                  >
                    {pricingOptions.map(option => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Time frame</Label>
                  <Select
                    id="timeframe"
                    value={timeframe}
                    onChange={e => setTimeframe(e.target.value)}
                  >
                    {timeframeOptions.map(option => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="custom">Custom dates</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Start</Label>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={e => {
                        setCustomStart(e.target.value);
                        setTimeframe('custom');
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End</Label>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={e => {
                        setCustomEnd(e.target.value);
                        setTimeframe('custom');
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle>Price history</CardTitle>
              <div className="text-xs text-slate-500">
                {history.length ? `${history.length} records` : 'No data yet'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                {chartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={value => format(new Date(value), 'MM/dd')}
                        minTickGap={20}
                      />
                      <YAxis domain={['auto', 'auto']} />
                      <Tooltip
                        formatter={(value: number) => value?.toFixed(2)}
                        labelFormatter={label => format(new Date(label), 'PP')}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="reg87" stroke="#0f172a" name="REG 87" />
                      <Line type="monotone" dataKey="mid89" stroke="#1d4ed8" name="MID 89" />
                      <Line type="monotone" dataKey="sup91" stroke="#b91c1c" name="SUP 91" />
                      <Line type="monotone" dataKey="diesel" stroke="#0ea5e9" name="ULS Diesel" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No data for this selection yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle>Latest prices</CardTitle>
              <Button onClick={refreshLatest} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>REG 87</TableHead>
                      <TableHead>MID 89</TableHead>
                      <TableHead>SUP 91</TableHead>
                      <TableHead>ULS Diesel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestForLocation.map(row => (
                      <TableRow key={`${row.pricing_type}-${row.scrape_id}`}>
                        <TableCell className="font-medium">{labelForPricing(row.pricing_type)}</TableCell>
                        <TableCell>{row.effective_date}</TableCell>
                        <TableCell>{formatNumber(row.reg_87)}</TableCell>
                        <TableCell>{formatNumber(row.mid_89)}</TableCell>
                        <TableCell>{formatNumber(row.sup_91)}</TableCell>
                        <TableCell>{formatNumber(row.uls_diesel)}</TableCell>
                      </TableRow>
                    ))}
                    {!latestForLocation.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500">
                          No data yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scrape status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Total runs" value={stats?.total_runs ?? 0} />
                <StatTile label="Completed" value={stats?.completed_runs ?? 0} />
                <StatTile label="Failed" value={stats?.failed_runs ?? 0} />
                <StatTile label="Records" value={stats?.total_records ?? 0} />
              </div>
              <div className="text-sm text-slate-600">
                Last run: {stats?.last_run_date ? format(new Date(stats.last_run_date), 'PPpp') : '—'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Server className="h-4 w-4" />
                {schedule?.cronExpression ? (
                  <span>
                    Schedule: <code className="rounded bg-slate-100 px-2 py-1">{schedule.cronExpression}</code>{' '}
                    ({schedule.timezone})
                  </span>
                ) : (
                  'Schedule not set'
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form className="space-y-3" onSubmit={handleScheduleSave}>
                <div className="space-y-2">
                  <Label>Cron expression</Label>
                  <Input
                    value={scheduleForm.cronExpression}
                    onChange={e => setScheduleForm({ ...scheduleForm, cronExpression: e.target.value })}
                    placeholder="0 4 * * *"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={scheduleForm.timezone}
                    onChange={e => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
                    placeholder="America/New_York"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Update schedule
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={triggerScrape}>
                    <Play className="mr-2 h-4 w-4" />
                    Run now
                  </Button>
                </div>
                {statusMessage && <div className="text-sm text-slate-600">{statusMessage}</div>}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {runs.map(run => (
                  <div
                    key={run.scrape_id}
                    className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{run.scrape_id}</div>
                      <div className="text-xs text-slate-600">
                        {format(new Date(run.started_at), 'PPpp')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(run.status)}>{run.status}</Badge>
                      <span className="text-xs text-slate-600">
                        {run.records_count} records{run.error_message ? ` • ${run.error_message}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {!runs.length && (
                  <div className="text-sm text-slate-600">No runs recorded yet.</div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={refreshRuns}>
                <Clock className="mr-2 h-4 w-4" />
                Refresh list
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return Number(value).toFixed(2);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function labelForPricing(value: PricingType) {
  return pricingOptions.find(p => p.value === value)?.label ?? value;
}

function badgeVariant(status: RunRow['status']) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'failed':
      return 'danger' as const;
    default:
      return 'outline' as const;
  }
}

export default App;
