"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Users,
  Target,
  Clock,
  Award,
  CheckCircle,
  FileText,
  Database,
  Layers,
  Activity,
  Loader2,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import {
  getBatchStats,
  getBatchDashboard,
  getProjectBatchStats,
  type BatchStatsResponse,
  type BatchDashboardResponse,
} from "@/app/api/batch";
import {
  getLabelStatistics,
  type LabelStatsResponse,
} from "@/app/api/label";
import {
  getSchemaStatistics,
} from "@/app/api/schema";
import { viewAllProjects } from "@/app/api/project";

type TimePeriod = "7d" | "30d" | "3m";

export default function StatisticPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30d");
  const [batchStats, setBatchStats] = useState<BatchStatsResponse | null>(null);
  const [batchDashboard, setBatchDashboard] = useState<BatchDashboardResponse | null>(null);
  const [labelStats, setLabelStats] = useState<LabelStatsResponse[]>([]);
  const [schemaStats, setSchemaStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectBatchStats, setProjectBatchStats] = useState<any>(null);

  useEffect(() => {
    loadAllStatistics();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectBatchStats(selectedProjectId);
    }
  }, [selectedProjectId, timePeriod]);

  // Reload dashboard data when time period changes
  useEffect(() => {
    // Reload data with new time period filter
    if (batchDashboard !== null) {
      // Only reload if we have initial data loaded
      loadAllStatistics();
    }
  }, [timePeriod]);

  const loadAllStatistics = async () => {
    try {
      setIsLoading(true);
      // Load critical stats first
      await Promise.all([
        loadBatchStats(),
        loadBatchDashboard(),
        loadProjects(),
      ]);
      // Load optional stats (don't fail if these fail)
      await Promise.allSettled([
        loadLabelStats(),
        loadSchemaStats(),
      ]);
    } catch (error: any) {
      toast.error("Failed to load statistics");
      console.error("Error loading statistics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBatchStats = async () => {
    try {
      const stats = await getBatchStats({
        time_period: timePeriod,
      });
      setBatchStats(stats);
    } catch (error: any) {
      console.error("Failed to load batch stats:", error);
    }
  };

  const loadBatchDashboard = async () => {
    try {
      const dashboard = await getBatchDashboard({
        time_period: timePeriod,
      });
      setBatchDashboard(dashboard);
    } catch (error: any) {
      console.error("Failed to load batch dashboard:", error);
    }
  };

  const loadLabelStats = async () => {
    try {
      // Note: getLabelStatistics requires a dataset_id
      // Since projects don't have dataset_id, we'll skip label stats for now
      // or you can implement a way to get dataset_id from projects if needed
      // For now, we'll leave it empty
      setLabelStats([]);
    } catch (error: any) {
      console.error("Failed to load label stats:", error);
      setLabelStats([]);
    }
  };

  const loadSchemaStats = async () => {
    try {
      // Try to get schema stats without dataset_id (optional parameter)
      const stats = await getSchemaStatistics();
      setSchemaStats(stats);
    } catch (error: any) {
      console.error("Failed to load schema stats:", error);
      // Don't show toast for schema stats as it's optional
      // Just log the error and continue
      setSchemaStats(null);
    }
  };

  const loadProjects = async () => {
    try {
      const projs = await viewAllProjects();
      setProjects(projs);
      if (projs.length > 0) {
        setSelectedProjectId(projs[0].project_id);
      }
    } catch (error: any) {
      console.error("Failed to load projects:", error);
      setProjects([]);
    }
  };

  const loadProjectBatchStats = async (projectId: number) => {
    try {
      const stats = await getProjectBatchStats(projectId, {
        time_period: timePeriod,
      });
      setProjectBatchStats(stats);
    } catch (error: any) {
      console.error("Failed to load project batch stats:", error);
    }
  };

  // Note: Date filtering is now handled by the API via time_period parameter

  // Prepare data for charts
  const batchStatusData = batchStats
    ? [
        { status: "pending", batches: batchStats.pending_batches, fill: "var(--color-pending)" },
        { status: "in_progress", batches: batchStats.in_progress_batches, fill: "var(--color-in_progress)" },
        { status: "completed", batches: batchStats.completed_batches, fill: "var(--color-completed)" },
        { status: "blocked", batches: batchStats.blocked_batches, fill: "var(--color-blocked)" },
      ]
    : [];

  const labelUsageData = labelStats.map((stat, index) => {
    const labelKey = `label_${index}`;
    return {
      label: stat.label_name || `Label ${stat.label_id}`,
      usage: stat.total_annotations || 0,
      fill: `var(--color-${labelKey})`,
    };
  });

  // Transform recent_batches to batch progress data (already filtered by API)
  const batchProgressData = (batchDashboard?.recent_batches || []).map((batch) => ({
    batch_name: batch.batch_name || `Batch ${batch.batch_id}`,
    date: batch.created_at || new Date().toISOString(),
    dateFormatted: batch.created_at 
      ? new Date(batch.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    progress_percentage: batch.progress_percentage || 0,
    completed_files: batch.completed_files || 0,
    total_files: batch.total_files || 0,
  }));

  // Transform user_assignments to top labelers data (already filtered by API)
  const topLabelersData = (batchDashboard?.user_assignments || []).map((assignment) => ({
    username: assignment.user_username || `User ${assignment.user_id}`,
    user_id: assignment.user_id,
    completed: 0, // Will need to calculate from batch progress
    assigned: 1,
    status: "active",
  }));

  // Create daily progress from recent batches (already filtered by API, group by date)
  const dailyProgressData = (batchDashboard?.recent_batches || []).reduce((acc: any[], batch) => {
    const date = new Date(batch.created_at).toISOString().split('T')[0];
    const existing = acc.find((item) => item.date === date);
    if (existing) {
      existing.completed += batch.completed_files || 0;
    } else {
      acc.push({
        date,
        dateFormatted: new Date(batch.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: batch.completed_files || 0,
      });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  const chartConfig = {
    batches: {
      label: "Batches",
    },
    pending: {
      label: "Pending",
      color: "var(--chart-5)",
    },
    in_progress: {
      label: "In Progress",
      color: "var(--chart-1)",
    },
    completed: {
      label: "Completed",
      color: "var(--chart-2)",
    },
    blocked: {
      label: "Blocked",
      color: "var(--destructive)",
    },
    completed_files: {
      label: "Completed Files",
      color: "var(--chart-1)",
    },
    progress_percentage: {
      label: "Progress",
      color: "var(--chart-1)",
    },
    usage: {
      label: "Usage",
      color: "var(--chart-1)",
    },
    ...labelUsageData.slice(0, 10).reduce((acc, item, index) => {
      acc[`label_${index}`] = {
        label: item.label,
        color: `var(--chart-${(index % 5) + 1})`,
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>),
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Statistics Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of system performance and progress
        </p>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batchStats?.total_batches || 0}
            </div>
            <p className="text-xs text-muted-foreground">All batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {batchStats?.completed_batches || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {batchStats
                ? Math.round(
                    (batchStats.completed_batches / batchStats.total_batches) * 100
                  )
                : 0}
              % completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {batchStats?.in_progress_batches || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batchStats?.total_files || 0}
            </div>
            <p className="text-xs text-muted-foreground">All files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Files</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {batchStats?.completed_files || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {batchStats
                ? Math.round(
                    (batchStats.completed_files / batchStats.total_files) * 100
                  )
                : 0}
              % completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batchStats?.overall_progress?.toFixed(1) || 0}%
            </div>
            <Progress
              value={batchStats?.overall_progress || 0}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Time Period Filter */}
      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          value={timePeriod}
          onValueChange={(value) => {
            if (value) setTimePeriod(value as TimePeriod);
          }}
          className="border rounded-md"
        >
          <ToggleGroupItem value="7d" aria-label="Last 7 days">
            Last 7 days
          </ToggleGroupItem>
          <ToggleGroupItem value="30d" aria-label="Last 30 days">
            Last 30 days
          </ToggleGroupItem>
          <ToggleGroupItem value="3m" aria-label="Last 3 months">
            Last 3 months
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch Status Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Batch Status Distribution</CardTitle>
            <CardDescription>Distribution of batches by status</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {batchStatusData.length > 0 ? (
              <ChartContainer
                id="batch-status"
                config={chartConfig}
                className="mx-auto aspect-square max-h-[300px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={batchStatusData}
                    dataKey="batches"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    {batchStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="grid grid-cols-2 gap-2 w-full">
              {batchStatusData.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm">{(chartConfig as any)[item.status]?.label || item.status}</span>
                  <span className="text-sm text-muted-foreground">
                    ({item.batches})
                  </span>
                </div>
              ))}
            </div>
          </CardFooter>
        </Card>

        {/* Label Usage Bar Chart */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Label Usage Statistics</CardTitle>
            <CardDescription>Most used labels across datasets</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {labelUsageData.length > 0 ? (
              <ChartContainer id="label-usage" config={chartConfig} className="aspect-auto h-[300px] w-full">
                <BarChart
                  accessibilityLayer
                  data={labelUsageData.slice(0, 10)}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="usage"
                      />
                    }
                  />
                  <Bar dataKey="usage" fill="var(--color-usage)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No label data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Progress Area Chart */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Daily Progress</CardTitle>
            <CardDescription>Files completed per day</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {dailyProgressData.length > 0 ? (
              <ChartContainer id="daily-progress" config={chartConfig} className="aspect-auto h-[300px] w-full">
                <AreaChart
                  data={dailyProgressData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <defs>
                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-completed_files)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-completed_files)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="dateFormatted"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                  />
                  <YAxis />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value, payload) => {
                          const item = payload?.[0]?.payload;
                          if (item?.date) {
                            return new Date(item.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                          }
                          return value;
                        }}
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    type="natural"
                    dataKey="completed"
                    fill="url(#fillCompleted)"
                    stroke="var(--color-completed_files)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No daily progress data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batch Progress Line Chart */}
        <Card className="flex flex-col py-4 sm:py-0">
          <CardHeader className="items-center pb-0">
            <CardTitle>Batch Progress Over Time</CardTitle>
            <CardDescription>Progress percentage by batch</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0 px-2 sm:p-6">
            {batchProgressData.length > 0 ? (
              <ChartContainer id="batch-progress" config={chartConfig} className="aspect-auto h-[250px] w-full">
                <LineChart
                  accessibilityLayer
                  data={batchProgressData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="w-[150px]"
                        nameKey="progress_percentage"
                        labelFormatter={(value) => {
                          return new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        }}
                      />
                    }
                  />
                  <Line
                    dataKey="progress_percentage"
                    type="monotone"
                    stroke="var(--color-progress_percentage)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No batch progress data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Labelers Table */}
      {topLabelersData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Labelers</CardTitle>
            <CardDescription>
              Performance metrics for top labelers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Labeler</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLabelersData.map((labeler: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {labeler.username || labeler.user_id}
                    </TableCell>
                    <TableCell>{labeler.completed || 0}</TableCell>
                    <TableCell>{labeler.assigned || 0}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>
                            {labeler.assigned
                              ? Math.round(
                                  (labeler.completed / labeler.assigned) * 100
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            labeler.assigned
                              ? (labeler.completed / labeler.assigned) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          labeler.status === "active" ? "default" : "secondary"
                        }
                      >
                        {labeler.status || "N/A"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Schema Statistics */}
      {schemaStats && (
        <Card>
          <CardHeader>
            <CardTitle>Schema Statistics</CardTitle>
            <CardDescription>Schema and ontology statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Schemas</p>
                <p className="text-2xl font-bold">
                  {schemaStats.total_schemas || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Versions</p>
                <p className="text-2xl font-bold">
                  {schemaStats.total_versions || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">
                  {schemaStats.total_files || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
