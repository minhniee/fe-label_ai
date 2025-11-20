"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Database, Tag, Users, FileText, TrendingUp, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { getBatchDashboard, getBatchStats } from "@/app/api/batch"
import { viewAllProjects } from "@/app/api/project"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [batchStats, setBatchStats] = useState<any>(null)
  const [batchDashboard, setBatchDashboard] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load batch dashboard data
      const [dashboardData, statsData, projectsData] = await Promise.all([
        getBatchDashboard().catch(() => null),
        getBatchStats().catch(() => null),
        viewAllProjects().catch(() => [])
      ])
      
      setBatchDashboard(dashboardData)
      setBatchStats(statsData)
      setProjects(projectsData)
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate statistics from API data
  const stats = {
    totalDatasets: projects.length || 0,
    labelingProgress: batchStats?.overall_progress || batchDashboard?.stats?.overall_progress || 0,
    activeLabelers: batchDashboard?.user_assignments?.length || 0,
    latestVersion: projects.length > 0 ? `v${projects.length}` : "v1.0",
    completedBatches: batchStats?.completed_batches || batchDashboard?.stats?.completed_batches || 0,
    pendingBatches: batchStats?.pending_batches || batchDashboard?.stats?.pending_batches || 0,
    inProgressBatches: batchStats?.in_progress_batches || batchDashboard?.stats?.in_progress_batches || 0,
    totalBatches: batchStats?.total_batches || batchDashboard?.stats?.total_batches || 0,
    totalQuestions: batchStats?.total_files || batchDashboard?.stats?.total_files || 0,
    labeledQuestions: batchStats?.completed_files || batchDashboard?.stats?.completed_files || 0,
  }
  
  // Get recent batches from dashboard
  const recentBatches = batchDashboard?.recent_batches || []
  const overdueBatches = batchDashboard?.overdue_batches || []
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of system statistics and recent activities</p>
      </div>
      

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalDatasets}</div>
            <p className="text-xs text-muted-foreground">Latest version: {stats.latestVersion}</p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labeling Progress</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.labelingProgress}%</div>
            <Progress value={stats.labelingProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.labeledQuestions}/{stats.totalQuestions} files
            </p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Labelers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.activeLabelers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Batches</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.completedBatches}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingBatches} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest activities in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentBatches.length === 0 && overdueBatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <>
                {/* Recent batches */}
                {recentBatches.slice(0, 3).map((batch: any) => (
                  <div key={batch.batch_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        batch.status === 'completed' ? 'bg-accent/10' : 
                        batch.status === 'in_progress' ? 'bg-primary/10' : 
                        'bg-muted'
                      }`}>
                        <Tag className={`h-4 w-4 ${
                          batch.status === 'completed' ? 'text-accent' : 
                          batch.status === 'in_progress' ? 'text-primary' : 
                          'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{batch.batch_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {batch.updated_at ? formatDistanceToNow(new Date(batch.updated_at), { addSuffix: true }) : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        batch.status === 'completed' ? 'default' : 
                        batch.status === 'in_progress' ? 'secondary' : 
                        'outline'
                      }
                    >
                      {batch.status === 'completed' ? 'Completed' : 
                       batch.status === 'in_progress' ? 'In Progress' : 
                       batch.status}
                    </Badge>
                  </div>
                ))}

                {/* Overdue batches */}
                {overdueBatches.slice(0, 2).map((batch: any) => (
                  <div key={batch.batch_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-destructive/10 p-2 rounded-full">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{batch.batch_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {batch.updated_at ? formatDistanceToNow(new Date(batch.updated_at), { addSuffix: true }) : 'Overdue'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">Needs Attention</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Overview
            </CardTitle>
            <CardDescription>Detailed statistics on the labeling process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Labeled Data</span>
                <span className="text-sm text-muted-foreground">{stats.labelingProgress}%</span>
              </div>
              <Progress value={stats.labelingProgress} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Completed Batches</span>
                <span className="text-sm text-muted-foreground">
                  {stats.totalBatches > 0 
                    ? Math.round((stats.completedBatches / stats.totalBatches) * 100)
                    : 0}%
                </span>
              </div>
              <Progress
                value={stats.totalBatches > 0
                  ? (stats.completedBatches / stats.totalBatches) * 100
                  : 0}
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.completedBatches}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.inProgressBatches}
                </div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>

            {/* Additional stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.totalBatches}
                </div>
                <div className="text-xs text-muted-foreground">Total Batches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.pendingBatches}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

