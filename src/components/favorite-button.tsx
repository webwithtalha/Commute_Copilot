"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({
  isFavorite,
  onToggle,
  size = "md",
  className,
}: FavoriteButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation(); // Prevent card click when clicking favorite
        onToggle();
      }}
      className={cn(
        sizeClasses[size],
        "rounded-full transition-all duration-200",
        isFavorite
          ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          : "text-muted-foreground hover:text-red-500 hover:bg-muted",
        className
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          iconSizes[size],
          "transition-all duration-200",
          isFavorite && "fill-current"
        )}
      />
    </Button>
  );
}
