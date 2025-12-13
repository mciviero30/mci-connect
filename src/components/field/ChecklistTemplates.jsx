// Predefined checklist templates for different wall types
export const CHECKLIST_TEMPLATES = {
  solid_walls: {
    name: "Solid Walls",
    items: [
      { text: "Staging product", status: "pending" },
      { text: "Check Dimension", status: "pending" },
      { text: "Layout", status: "pending" },
      { text: "Base and Ceiling track", status: "pending" },
      { text: "Studs", status: "pending" },
      { text: "Horizontal", status: "pending" },
      { text: "Power", status: "pending" },
      { text: "Check for plumb", status: "pending" },
      { text: "Rubber base", status: "pending" },
      { text: "Cladding", status: "pending" },
      { text: "Cover face plates", status: "pending" },
    ]
  },
  glass_walls: {
    name: "Glass Walls",
    items: [
      { text: "Staging product", status: "pending" },
      { text: "Check Dimension", status: "pending" },
      { text: "Layout", status: "pending" },
      { text: "Base track", status: "pending" },
      { text: "Install panels", status: "pending" },
      { text: "Check alignment", status: "pending" },
      { text: "Seal joints", status: "pending" },
      { text: "Final inspection", status: "pending" },
    ]
  },
  demountable_walls: {
    name: "Demountable Walls",
    items: [
      { text: "Staging product", status: "pending" },
      { text: "Check Dimension", status: "pending" },
      { text: "Layout", status: "pending" },
      { text: "Install track system", status: "pending" },
      { text: "Mount panels", status: "pending" },
      { text: "Electrical integration", status: "pending" },
      { text: "Test panels", status: "pending" },
      { text: "Final cleanup", status: "pending" },
    ]
  },
};

// Status icons and colors
export const CHECKLIST_STATUS = {
  completed: {
    icon: "check",
    color: "text-[#FFB800]", // MCI Field yellow
    bgColor: "bg-[#FFB800]",
    label: "Completed"
  },
  in_progress: {
    icon: "minus",
    color: "text-green-500",
    bgColor: "bg-green-500",
    label: "In Progress"
  },
  not_completed: {
    icon: "x",
    color: "text-red-500",
    bgColor: "bg-red-500",
    label: "Not Completed"
  },
  pending: {
    icon: "square",
    color: "text-slate-400",
    bgColor: "bg-transparent",
    label: "Pending"
  }
};

// Calculate progress statistics
export const calculateProgress = (checklist) => {
  if (!checklist || checklist.length === 0) {
    return { completed: 0, inProgress: 0, pending: 0, notCompleted: 0, percentage: 0 };
  }

  const stats = {
    completed: 0,
    inProgress: 0,
    pending: 0,
    notCompleted: 0,
  };

  checklist.forEach(item => {
    const status = item.status || 'pending';
    if (status === 'completed') stats.completed++;
    else if (status === 'in_progress') stats.inProgress++;
    else if (status === 'not_completed') stats.notCompleted++;
    else stats.pending++;
  });

  const percentage = Math.round((stats.completed / checklist.length) * 100);

  return { ...stats, percentage };
};