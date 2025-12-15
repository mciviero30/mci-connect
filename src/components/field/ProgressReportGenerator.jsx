import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const MCI_YELLOW = '#FFB800';
const MCI_DARK = '#1a1a1a';
const MCI_GRAY = '#64748b';
const MCI_LIGHT_GRAY = '#f8fafc';

export async function generateProgressReportPDF(report, job, tasks, photos, plans, user, taskComments = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Filter tasks by category based on report type
  const categoryMap = {
    'progress_report': 'installation',
    'change_order_report': 'change_order',
    'rfi_report': 'rfi'
  };
  
  const targetCategory = categoryMap[report.report_type];
  const filteredTasks = targetCategory 
    ? tasks.filter(task => task.category === targetCategory)
    : tasks;

  // Sort tasks by wall number
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aNum = parseInt(a.wall_number || a.title?.match(/\d+/)?.[0] || '0');
    const bNum = parseInt(b.wall_number || b.title?.match(/\d+/)?.[0] || '0');
    return aNum - bNum;
  });

  let pageNumber = 1;

  // Helper: Add header with logo
  const addHeader = () => {
    // Yellow stripe at top
    doc.setFillColor(255, 184, 0);
    doc.rect(0, 0, pageWidth, 8, 'F');
    
    // MCI Field logo text
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.text('MCI FIELD', margin, 14);
    
    // Report number on right
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    const reportTypeLabel = {
      progress_report: 'Progress Report',
      punch_report: 'Punch Report',
      rfi_report: 'RFI Report',
      change_order_report: 'Change Order Report',
    }[report.report_type] || 'Progress Report';
    doc.text(`${reportTypeLabel} #${report.report_number || '001'}`, pageWidth - margin, 14, { align: 'right' });
  };

  // Helper: Add footer
  const addFooter = () => {
    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${job.name || 'Project'} | Created with MCI Field on ${format(new Date(), 'MM-dd-yyyy')}`,
      margin,
      pageHeight - 12
    );
    doc.text(
      `Page ${pageNumber}`,
      pageWidth - margin,
      pageHeight - 12,
      { align: 'right' }
    );
    pageNumber++;
  };

  // ============== COVER PAGE ==============
  doc.setFillColor(100, 100, 110);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Job name
  doc.setFontSize(24);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.text(job.name || job.job_name_field || 'Project', margin, 40);

  // Report type
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  const reportTypeLabel = {
    progress_report: 'Progress Report',
    punch_report: 'Punch Report',
    rfi_report: 'RFI Report',
    change_order_report: 'Change of Order Report',
  }[report.report_type] || 'Progress Report';
  doc.text(reportTypeLabel, margin, 55);

  // Report number
  doc.setFontSize(14);
  doc.text(`#${report.report_number || '001'}`, margin, 65);

  // Metadata
  doc.setFontSize(10);
  doc.text(`Created: ${format(new Date(report.created_date || new Date()), 'MM-dd-yyyy')}`, margin, 80);
  doc.text(`Creator: ${user?.full_name || 'MCI Team'}`, margin, 87);
  
  if (job.status) {
    doc.text(`Status: ${job.status}`, margin, 94);
  }

  if (job.start_date_field || job.created_date) {
    const startDate = format(new Date(job.start_date_field || job.created_date), 'MM-dd-yyyy');
    const endDate = format(new Date(), 'MM-dd-yyyy');
    doc.text(`Dates: ${startDate} - ${endDate}`, margin, 101);
  }

  // Recipients
  if (report.recipients && report.recipients.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recipients', margin, 115);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    report.recipients.forEach((email, i) => {
      doc.text(email, margin, 122 + i * 6);
    });
  }

  addFooter();

  // ============== TASK PAGES ==============
  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    doc.addPage();
    let yPos = margin;

    // Task header
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const taskTitle = task.title || `Wall ${task.wall_number || String(i + 1).padStart(3, '0')}`;
    doc.text(taskTitle, margin, yPos);
    yPos += 8;

    // Status line
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const statusText = `${task.status || 'Pending'} | ${task.assigned_to_name || 'Unassigned'} | ${task.category || 'Installation'}`;
    doc.text(statusText, margin, yPos);
    yPos += 7;

    // Plan reference
    if (task.blueprint_id) {
      const plan = plans.find(p => p.id === task.blueprint_id);
      if (plan) {
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text(`Plan: ${plan.name}`, margin, yPos);
        yPos += 6;
      }
    }

    // Tags
    if (task.tags && task.tags.length > 0) {
      doc.setFontSize(8);
      doc.text(`Tags: ${task.tags.map(t => `#${t}`).join(', ')}`, margin, yPos);
      yPos += 6;
    }

    // Dates
    doc.setFontSize(8);
    let dateStr = `Created ${format(new Date(task.created_date), 'MM-dd-yyyy')}`;
    if (task.status === 'completed' && task.updated_date) {
      dateStr += ` | Completed ${format(new Date(task.updated_date), 'MM-dd-yyyy')}`;
    }
    doc.text(dateStr, margin, yPos);
    yPos += 10;

    // Checklist
    const checklist = task.checklist || task.checklist_items || [];
    if (checklist.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Checklist', margin, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      checklist.forEach((item) => {
        // Handle different status formats
        const isCompleted = item.status === 'completed' || item.checked === true;
        const isInProgress = item.status === 'in_progress';
        const checkbox = isCompleted ? '☑' : (isInProgress ? '◐' : '☐');
        const itemText = `${checkbox} ${item.text}`;
        const assignee = isCompleted && (task.assignee_name || task.assigned_to_name) ? ` (@${(task.assignee_name || task.assigned_to_name).split(' ')[0]})` : '';
        
        if (yPos > pageHeight - 30) {
          addFooter();
          doc.addPage();
          yPos = margin;
        }

        doc.text(itemText + assignee, margin + 2, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // Task messages/comments
    const comments = taskComments[task.id] || task.comments || [];
    if (comments.length > 0) {
      if (yPos > pageHeight - 40) {
        addFooter();
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Activity', margin, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      comments.slice(0, 5).forEach((comment) => {
        const commentText = `${comment.author_name || 'User'} - ${comment.comment || comment.content}`;
        const date = format(new Date(comment.created_date), 'dd MMM hh:mm a');
        
        if (yPos > pageHeight - 30) {
          addFooter();
          doc.addPage();
          yPos = margin;
        }

        doc.text(`${commentText} (${date})`, margin + 2, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // Location mini-map
    if (task.pin_x && task.pin_y && task.blueprint_id) {
      const plan = plans.find(p => p.id === task.blueprint_id);
      if (plan && plan.file_url) {
        if (yPos > pageHeight - 50) {
          addFooter();
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Location on Plan', margin, yPos);
        yPos += 6;

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Position: ${Math.round(task.pin_x)}%, ${Math.round(task.pin_y)}% on ${plan.name}`, margin, yPos);
        yPos += 8;
      }
    }

    // Photos
    const taskPhotos = task.photo_urls 
      ? task.photo_urls.map((url, idx) => ({ url, id: `${task.id}-${idx}` }))
      : photos.filter(p => p.task_id === task.id);
    if (taskPhotos.length > 0 && report.include_options?.photos !== false) {
      if (yPos > pageHeight - 40) {
        addFooter();
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Photos', margin, yPos);
      yPos += 8;

      const photoSize = 50;
      const photosPerRow = 3;
      let photoCount = 0;
      let rowYPos = yPos;

      if (taskPhotos.length > 0) {
        doc.setTextColor(100);
        doc.text(`${taskPhotos.length} photo${taskPhotos.length > 1 ? 's' : ''} attached`, margin, yPos);
        yPos += 8;
      }

      yPos = rowYPos + Math.ceil(Math.min(taskPhotos.length, 9) / photosPerRow) * (photoSize + 8) + 5;
    }

    addFooter();
  }

  return doc;
}