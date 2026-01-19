import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, MapPin } from "lucide-react";

export default function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusOptions,
  teamFilter,
  onTeamChange,
  teams,
  onClearFilters,
  language = 'en'
}) {
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || (teamFilter && teamFilter !== 'all');

  return (
    <Card className="bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700 mb-4 sm:mb-6">
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">
              {language === 'es' ? 'Buscar' : 'Search'}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 sm:pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white min-h-[44px] text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Status Filter */}
          {statusOptions && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">
                {language === 'es' ? 'Estado' : 'Status'}
              </Label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white min-h-[44px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all">
                    {language === 'es' ? 'Todos los Estados' : 'All Status'}
                  </SelectItem>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.dotClass && <div className={`w-2 h-2 rounded-full ${option.dotClass}`} />}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Team Filter */}
          {teams && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">
                {language === 'es' ? 'Equipo' : 'Team'}
              </Label>
              <Select value={teamFilter} onValueChange={onTeamChange}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white min-h-[44px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all">
                    {language === 'es' ? 'Todos los Equipos' : 'All Teams'}
                  </SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {team.team_name} - {team.location}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}