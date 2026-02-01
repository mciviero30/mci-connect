import React from "react";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function FavoriteButton({ entityType, entityId, entityName, user, size = "sm" }) {
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id, entityType],
    queryFn: () => base44.entities.Favorite.filter({ user_id: user?.id, entity_type: entityType }),
    enabled: !!user?.id,
  });

  const isFavorite = favorites.some(f => f.entity_id === entityId);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        const favorite = favorites.find(f => f.entity_id === entityId);
        await base44.entities.Favorite.delete(favorite.id);
      } else {
        await base44.entities.Favorite.create({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        toggleMutation.mutate();
      }}
      className={`${isFavorite ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'} hover:text-amber-500 transition-colors`}
    >
      <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
    </Button>
  );
}