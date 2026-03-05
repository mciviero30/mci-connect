import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ClipboardList, Users, TrendingUp, Calendar } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";

const COLORS = ["#3B9FF3", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function FormsAnalyticsTab({ templates, submissions, employees }) {
  const stats = useMemo(() => {
    const total = submissions.length;
    const last7 = submissions.filter(s =>
      isAfter(new Date(s.submission_date), subDays(new Date(), 7))
    ).length;
    const last30 = submissions.filter(s =>
      isAfter(new Date(s.submission_date), subDays(new Date(), 30))
    ).length;

    // Submissions per form
    const perForm = templates.map(t => ({
      name: t.name.length > 20 ? t.name.slice(0, 20) + "…" : t.name,
      fullName: t.name,
      count: submissions.filter(s => s.template_id === t.id).length,
    })).sort((a, b) => b.count - a.count);

    // Submissions per day (last 14 days)
    const perDay = Array.from({ length: 14 }, (_, i) => {
      const day = subDays(new Date(), 13 - i);
      const label = format(day, "MMM d");
      const count = submissions.filter(s => {
        const d = new Date(s.submission_date);
        return format(d, "MMM d") === label;
      }).length;
      return { label, count };
    });

    // Top submitters
    const submitterMap = {};
    submissions.forEach(s => {
      const key = s.submitted_by_name || s.submitted_by_email || "Unknown";
      submitterMap[key] = (submitterMap[key] || 0) + 1;
    });
    const topSubmitters = Object.entries(submitterMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Form type distribution
    const typeMap = {};
    templates.forEach(t => {
      typeMap[t.type || "custom"] = (typeMap[t.type || "custom"] || 0) +
        submissions.filter(s => s.template_id === t.id).length;
    });
    const byType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

    return { total, last7, last30, perForm, perDay, topSubmitters, byType };
  }, [templates, submissions]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Submissions", value: stats.total, icon: ClipboardList, color: "text-blue-600" },
          { label: "Last 7 Days", value: stats.last7, icon: Calendar, color: "text-green-600" },
          { label: "Last 30 Days", value: stats.last30, icon: TrendingUp, color: "text-amber-600" },
          { label: "Active Templates", value: templates.filter(t => t.active).length, icon: Users, color: "text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color} opacity-80`} />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Submissions over time */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Submissions — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.perDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B9FF3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By form */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Submissions by Form</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.perForm.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v, n, props) => [v, props.payload.fullName]} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Type distribution */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">By Form Type</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <PieChart width={120} height={120}>
              <Pie data={stats.byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={55}>
                {stats.byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
            <div className="space-y-1 flex-1">
              {stats.byType.map(({ type, count }, i) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="capitalize text-slate-600 dark:text-slate-400">{type}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top submitters */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Top Submitters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topSubmitters.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No submissions yet</p>
              )}
              {stats.topSubmitters.map(({ name, count }, i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center pl-2"
                      style={{ width: `${Math.min(100, (count / (stats.topSubmitters[0]?.count || 1)) * 100)}%` }}
                    >
                      <span className="text-[10px] text-white font-semibold truncate">{name}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}