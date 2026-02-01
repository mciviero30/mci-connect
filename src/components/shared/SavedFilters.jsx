import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

export default function SavedFilters({ page, currentFilters, onApplyFilter, user }) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: savedFilters = [] } = useQuery({
    queryKey: ['savedFilters', page, user?.id],
    queryFn: () => base44.entities.SavedFilter.filter({ user_id: user?.id, page }),
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedFilter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedFilters'] });
      toast.success('Filter saved');
      setShowSaveDialog(false);
      setFilterName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedFilter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedFilters'] });
      toast.success('Filter deleted');
    },
  });

  const handleSave = () => {
    if (!filterName.trim()) return;
    saveMutation.mutate({
      user_id: user.id,
      page,
      name: filterName,
      filters: currentFilters,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {savedFilters.map((filter) => (
        <Badge
          key={filter.id}
          className="bg-[#507DB4]/10 dark:bg-[#6B9DD8]/20 text-[#507DB4] dark:text-[#6B9DD8] border border-[#507DB4]/30 dark:border-[#6B9DD8]/30 px-3 py-1.5 cursor-pointer hover:bg-[#507DB4]/20 dark:hover:bg-[#6B9DD8]/30 transition-colors flex items-center gap-2"
        >
          <button onClick={() => onApplyFilter(filter.filters)} className="flex items-center gap-1.5">
            <Star className="w-3 h-3" />
            {filter.name}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate(filter.id);
            }}
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSaveDialog(true)}
        className="h-8 text-xs"
      >
        <Save className="w-3.5 h-3.5 mr-1.5" />
        Save Filter
      </Button>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Filter name (e.g., Active Jobs)"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!filterName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}