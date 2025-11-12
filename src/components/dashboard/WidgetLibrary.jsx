import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  DollarSign, 
  Users, 
  Briefcase, 
  Receipt, 
  MapPin, 
  BarChart3,
  Calendar,
  Award,
  Cake,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_WIDGETS = {
  admin: [
    { id: 'active-employees', title: 'Active Employees', icon: Users, category: 'people', size: 'small' },
    { id: 'active-jobs', title: 'Active Jobs', icon: Briefcase, category: 'jobs', size: 'small' },
    { id: 'pending-expenses', title: 'Pending Expenses', icon: Receipt, category: 'finance', size: 'small' },
    { id: 'total-hours', title: 'Total Hours', icon: Clock, category: 'time', size: 'small' },
    { id: 'pending-timesheets', title: 'Pending Timesheets', icon: AlertTriangle, category: 'time', size: 'medium' },
    { id: 'birthdays-today', title: 'Birthdays Today', icon: Cake, category: 'people', size: 'medium' },
    { id: 'recent-recognitions', title: 'Recent Recognitions', icon: Award, category: 'people', size: 'medium' },
    { id: 'upcoming-birthdays', title: 'Upcoming Birthdays', icon: Calendar, category: 'people', size: 'medium' },
  ],
  employee: [
    { id: 'work-hours', title: 'Work Hours', icon: Clock, category: 'time', size: 'small' },
    { id: 'driving-hours', title: 'Driving Hours', icon: MapPin, category: 'time', size: 'small' },
    { id: 'weekly-pay', title: 'Weekly Pay', icon: DollarSign, category: 'finance', size: 'small' },
    { id: 'my-expenses', title: 'My Expenses', icon: Receipt, category: 'finance', size: 'small' },
    { id: 'my-assignments', title: 'My Assignments', icon: Briefcase, category: 'jobs', size: 'large' },
    { id: 'hours-chart', title: 'Hours Progress', icon: BarChart3, category: 'time', size: 'medium' },
  ]
};

const CATEGORIES = [
  { id: 'all', label: 'All Widgets' },
  { id: 'time', label: 'Time & Hours' },
  { id: 'finance', label: 'Finance' },
  { id: 'people', label: 'People' },
  { id: 'jobs', label: 'Jobs' },
];

export default function WidgetLibrary({ open, onOpenChange, onAddWidget, currentWidgets, userRole }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const availableWidgets = AVAILABLE_WIDGETS[userRole] || [];
  const currentWidgetIds = currentWidgets.map(w => w.type);

  const filteredWidgets = availableWidgets.filter(widget => {
    const matchesSearch = widget.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
    const notAdded = !currentWidgetIds.includes(widget.id);
    return matchesSearch && matchesCategory && notAdded;
  });

  const handleAdd = (widget) => {
    onAddWidget({
      id: `${widget.id}-${Date.now()}`,
      type: widget.id,
      title: widget.title,
      icon: widget.icon,
      size: widget.size,
      position: currentWidgets.length,
      visible: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-900">Widget Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search widgets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 border-slate-200"
          />

          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? "bg-[#3B9FF3]" : ""}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
            {filteredWidgets.map(widget => (
              <div
                key={widget.id}
                className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer bg-white group"
                onClick={() => handleAdd(widget)}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                    <widget.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{widget.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {widget.size}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filteredWidgets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No widgets found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}