import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function DashboardWidget({ 
  widget, 
  isEditing, 
  onRemove, 
  onResize,
  children,
  dragHandleProps 
}) {
  const sizeClasses = {
    small: "col-span-1",
    medium: "col-span-1 md:col-span-2",
    large: "col-span-1 md:col-span-3",
    full: "col-span-1 md:col-span-4"
  };

  const handleResize = () => {
    const sizes = ['small', 'medium', 'large', 'full'];
    const currentIndex = sizes.indexOf(widget.size || 'medium');
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    onResize(widget.id, nextSize);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={sizeClasses[widget.size || 'medium']}
    >
      <Card className={`h-full bg-white dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all ${
        isEditing ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
              {widget.icon && <widget.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              {widget.title}
            </CardTitle>
            {isEditing && (
              <div className="flex items-center gap-1">
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResize}
                  className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Resize widget"
                >
                  {widget.size === 'small' ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(widget.id)}
                  className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}