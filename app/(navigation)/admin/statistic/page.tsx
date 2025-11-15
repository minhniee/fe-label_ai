"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
  ResponsiveContainer,
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
  }, [selectedProjectId]);

  // Reload dashboard data when time period changes
  useEffect(() => {
    if (batchDashboard) {
      // Data is already loaded, just re-filter on client side
      // The filterByDate function will handle the filtering
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
      const stats = await getBatchStats();
      setBatchStats(stats);
    } catch (error: any) {
      console.error("Failed to load batch stats:", error);
    }
  };

  const loadBatchDashboard = async () => {
    try {
      const dashboard = await getBatchDashboard();
      setBatchDashboard(dashboard);
    } catch (error: any) {
      console.error("Failed to load batch dashboard:", error);
    }
  };

  const loadLabelStats = async () => {
    try {
      // Load label stats for all datasets (you may need to adjust this)
      // For now, we'll get stats from the first project's dataset
      if (projects.length > 0 && projects[0].dataset_id) {
        const stats = await getLabelStatistics(projects[0].dataset_id);
        setLabelStats(stats);
      }
    } catch (error: any) {
      console.error("Failed to load label stats:", error);
    }
  };

  const loadSchemaStats = async () => {
    try {
      // Try to get schema stats without dataset_id first
      // If that fails, try with a dataset_id from projects if available
      let stats;
      try {
        stats = await getSchemaStatistics();
      } catch (error: any) {
        // If fails without dataset_id, try with first project's dataset_id if available
        if (projects.length > 0 && projects[0].dataset_id) {
          stats = await getSchemaStatistics(projects[0].dataset_id);
        } else {
          throw error;
        }
      }
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
    }
  };

  const loadProjectBatchStats = async (projectId: number) => {
    try {
      const stats = await getProjectBatchStats(projectId);
      setProjectBatchStats(stats);
    } catch (error: any) {
      console.error("Failed to load project batch stats:", error);
    }
  };

  // Calculate date filter based on time period
  const getDateFilter = (period: TimePeriod): Date => {
    const now = new Date();
    switch (period) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "3m":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  // Filter data by date
  const filterByDate = <T extends { created_at?: string; updated_at?: string; assigned_at?: string }>(
    data: T[],
    dateField: "created_at" | "updated_at" | "assigned_at" = "created_at"
  ): T[] => {
    const filterDate = getDateFilter(timePeriod);
    return data.filter((item) => {
      const itemDate = item[dateField];
      if (!itemDate) return false;
      return new Date(itemDate) >= filterDate;
    });
  };

  // Prepare data for charts
  const batchStatusData = batchStats
    ? [
        { name: "Pending", value: batchStats.pending_batches, color: "hsl(var(--muted))" },
        { name: "In Progress", value: batchStats.in_progress_batches, color: "hsl(var(--primary))" },
        { name: "Completed", value: batchStats.completed_batches, color: "hsl(var(--chart-1))" },
        { name: "Blocked", value: batchStats.blocked_batches, color: "hsl(var(--destructive))" },
      ]
    : [];

  const labelUsageData = labelStats.map((stat, index) => {
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
    ];
    return {
      name: stat.label_name || `Label ${stat.label_id}`,
      value: stat.total_annotations || 0,
      color: colors[index % colors.length],
    };
  });

  // Transform recent_batches to batch progress data (filtered by date)
  const filteredRecentBatches = filterByDate(
    batchDashboard?.recent_batches || [],
    "created_at"
  );

  const batchProgressData = filteredRecentBatches.map((batch) => ({
    batch_name: batch.batch_name || `Batch ${batch.batch_id}`,
    progress_percentage: batch.progress_percentage || 0,
    completed_files: batch.completed_files || 0,
    total_files: batch.total_files || 0,
  }));

  // Transform user_assignments to top labelers data (filtered by date)
  const filteredUserAssignments = filterByDate(
    batchDashboard?.user_assignments || [],
    "assigned_at"
  );

  const topLabelersData = filteredUserAssignments.map((assignment) => ({
    username: assignment.user_username || `User ${assignment.user_id}`,
    user_id: assignment.user_id,
    completed: 0, // Will need to calculate from batch progress
    assigned: 1,
    status: "active",
  }));

  // Create daily progress from filtered recent batches (group by date)
  const dailyProgressData = filteredRecentBatches.reduce((acc: any[], batch) => {
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
      color: "hsl(var(--muted))",
    },
    in_progress: {
      label: "In Progress",
      color: "hsl(var(--primary))",
    },
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-1))",
    },
    blocked: {
      label: "Blocked",
      color: "hsl(var(--destructive))",
    },
  };

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
        <Card>
          <CardHeader>
            <CardTitle>Batch Status Distribution</CardTitle>
            <CardDescription>Distribution of batches by status</CardDescription>
          </CardHeader>
          <CardContent>
            {batchStatusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={batchStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    {batchStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {batchStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Label Usage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Label Usage Statistics</CardTitle>
            <CardDescription>Most used labels across datasets</CardDescription>
          </CardHeader>
          <CardContent>
            {labelUsageData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={labelUsageData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
        <Card>
          <CardHeader>
            <CardTitle>Daily Progress</CardTitle>
            <CardDescription>Files completed per day</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyProgressData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <AreaChart data={dailyProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.date ? new Date(item.date).toLocaleDateString() : label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
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
        <Card>
          <CardHeader>
            <CardTitle>Batch Progress Over Time</CardTitle>
            <CardDescription>Progress percentage by batch</CardDescription>
          </CardHeader>
          <CardContent>
            {batchProgressData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={batchProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="batch_name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="progress_percentage"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
