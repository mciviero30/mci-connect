import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "from-[#3B9FF3] to-blue-500", 
  loading = false,
  subtitle,
  onClick 
}) {
  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full bg-slate-100" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden group border-slate-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} rounded-full opacity-5 transform translate-x-8 -translate-y-8 group-hover:opacity-10 transition-opacity`} />
      <CardHeader className="p-6 relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 mb-2">{title}</p>
            <CardTitle className="text-3xl font-bold text-slate-900">{value}</CardTitle>
            {subtitle && (
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} shadow-md`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        {trend !== undefined && (
          <div className="flex items-center mt-4 text-sm">
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1 text-red-600" />
            )}
            <span className={trend > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {trend > 0 ? '+' : ''}{trend}% vs previous month
            </span>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}