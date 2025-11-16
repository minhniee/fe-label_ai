"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExternalLink, Download, Users, BarChart3, LayoutDashboard, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Administration</h1>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </CardTitle>
            <CardDescription>View system overview and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/dashboard">
              <Button className="w-full" variant="outline">
                Go to Dashboard
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>Export labeled data for Machine Learning</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/export-data">
              <Button className="w-full" variant="outline">
                Go to Export Data
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/manage-users">
              <Button className="w-full" variant="outline">
                Go to User Management
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistics
            </CardTitle>
            <CardDescription>View progress and performance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/statistic">
              <Button className="w-full" variant="outline">
                Go to Statistics
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <CardDescription>Track system changes and user activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/audit-log">
              <Button className="w-full" variant="outline">
                Go to Audit Log
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


