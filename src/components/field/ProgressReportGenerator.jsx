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
    doc.text(`${reportTypeLabel} #${report.report_number || '1'}`, pageWidth - margin, 14, { align: 'right' });
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
  // Dark gradient background
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Yellow accent bar
  doc.setFillColor(255, 184, 0);
  doc.rect(0, 0, pageWidth, 12, 'F');

  // MCI FIELD logo
  doc.setFontSize(16);
  doc.setTextColor(255, 184, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('MCI FIELD', margin, 35);
  
  // Project management system subtitle
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('Construction Project Management', margin, 42);

  // Yellow divider line
  doc.setDrawColor(255, 184, 0);
  doc.setLineWidth(2);
  doc.line(margin, 48, pageWidth - margin, 48);

  // Job name (large)
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const jobName = job.name || job.job_name_field || 'Project';
  doc.text(jobName, margin, 70);

  // Report type
  doc.setFontSize(20);
  doc.setTextColor(255, 184, 0);
  doc.setFont('helvetica', 'bold');
  const reportTypeLabel = {
    progress_report: 'Progress Report',
    punch_report: 'Punch Report',
    rfi_report: 'RFI Report',
    change_order_report: 'Change Order Report',
  }[report.report_type] || 'Progress Report';
  doc.text(reportTypeLabel, margin, 90);

  // Report number badge
  doc.setFillColor(255, 184, 0);
  doc.roundedRect(margin, 95, 30, 10, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${report.report_number || '1'}`, margin + 15, 102, { align: 'center' });

  // Metadata section
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  let metaY = 120;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Created:', margin, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(report.created_date || new Date()), 'MMMM dd, yyyy'), margin + 30, metaY);
  metaY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Creator:', margin, metaY);
  doc.setFont('helvetica', 'normal');
  const creatorName = user?.full_name || 'MCI Team';
  const capitalizedName = creatorName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  doc.text(capitalizedName, margin + 30, metaY);
  metaY += 8;
  
  if (job.status) {
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', margin, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(job.status.charAt(0).toUpperCase() + job.status.slice(1), margin + 30, metaY);
    metaY += 8;
  }

  if (job.start_date_field || job.created_date) {
    const startDate = format(new Date(job.start_date_field || job.created_date), 'MMM dd, yyyy');
    const endDate = format(new Date(), 'MMM dd, yyyy');
    doc.setFont('helvetica', 'bold');
    doc.text('Period:', margin, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${startDate} - ${endDate}`, margin + 30, metaY);
    metaY += 8;
  }

  if (job.address) {
    doc.setFont('helvetica', 'bold');
    doc.text('Location:', margin, metaY);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(job.address, contentWidth - 35);
    doc.text(lines, margin + 30, metaY);
    metaY += 8 * lines.length;
  }

  // Checklist Legend
  metaY += 10;
  doc.setFillColor(255, 184, 0, 0.1);
  doc.roundedRect(margin, metaY - 5, contentWidth, 30, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 184, 0);
  doc.text('Checklist Status Legend', margin + 5, metaY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);

  // Green - Completed
  doc.setDrawColor(34, 197, 94);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(margin + 8, metaY + 11, 2, 'FD');
  doc.text('Completed', margin + 13, metaY + 13);

  // Yellow - In Progress
  doc.setDrawColor(251, 191, 36);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(margin + 45, metaY + 11, 2, 'FD');
  doc.text('In Progress', margin + 50, metaY + 13);

  // Red - Pending
  doc.setDrawColor(239, 68, 68);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(margin + 85, metaY + 11, 2, 'FD');
  doc.text('Pending', margin + 90, metaY + 13);

  metaY += 25;

  // Recipients section
  if (report.recipients && report.recipients.length > 0) {
    metaY += 10;
    doc.setFillColor(255, 184, 0, 0.1);
    doc.roundedRect(margin, metaY - 5, contentWidth, 8 + report.recipients.length * 6, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 184, 0);
    doc.text('Recipients', margin + 5, metaY + 3);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    report.recipients.forEach((email, i) => {
      doc.text(`• ${email}`, margin + 5, metaY + 10 + i * 6);
    });
  }

  // Footer on cover
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Generated by MCI Field Construction Management System',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  
  pageNumber++;

  // ============== TASK PAGES ==============
  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    doc.addPage();
    
    // Add header
    addHeader();
    
    let yPos = 28;

    // Task header with yellow accent
    doc.setFillColor(255, 184, 0);
    doc.rect(margin - 5, yPos - 8, 5, 14, 'F');
    
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    const taskTitle = task.title || `Wall ${task.wall_number || String(i + 1).padStart(3, '0')}`;
    doc.text(taskTitle, margin + 5, yPos);

    // Location on Plan - top right
    if (task.pin_x && task.pin_y && task.blueprint_id) {
      const plan = plans.find(p => p.id === task.blueprint_id);
      if (plan) {
        doc.setFillColor(254, 243, 199);
        const locationWidth = 80;
        const locationX = pageWidth - margin - locationWidth;
        doc.roundedRect(locationX, yPos - 8, locationWidth, 10, 1.5, 1.5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(120, 53, 15);
        doc.setFont('helvetica', 'normal');
        doc.text(`${Math.round(task.pin_x)}%, ${Math.round(task.pin_y)}% - ${plan.name}`, locationX + 3, yPos - 2);
      }
    }

    yPos += 10;

    // Status badges
    const statusColors = {
      'pending': { bg: [241, 245, 249], text: [100, 116, 139] },
      'in_progress': { bg: [254, 243, 199], text: [180, 83, 9] },
      'completed': { bg: [220, 252, 231], text: [22, 101, 52] },
      'blocked': { bg: [254, 226, 226], text: [185, 28, 28] }
    };

    const statusColor = statusColors[task.status] || statusColors['pending'];
    doc.setFillColor(...statusColor.bg);
    doc.roundedRect(margin, yPos, 28, 7, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...statusColor.text);
    doc.setFont('helvetica', 'bold');
    doc.text((task.status || 'pending').toUpperCase(), margin + 14, yPos + 4.5, { align: 'center' });

    // Category only (removed assignee)
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`${(task.category || 'Installation').charAt(0).toUpperCase() + (task.category || 'Installation').slice(1)}`, margin + 32, yPos + 5);
    yPos += 12;

    // Info box with gray background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
    
    let infoY = yPos + 6;
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    
    // Plan reference
    if (task.blueprint_id) {
      const plan = plans.find(p => p.id === task.blueprint_id);
      if (plan) {
        doc.text('Plan:', margin + 3, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(plan.name, margin + 15, infoY);
        infoY += 5;
      }
    }

    // Dates
    doc.setFont('helvetica', 'bold');
    doc.text('Created:', margin + 3, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(task.created_date), 'MMM dd, yyyy'), margin + 18, infoY);
    
    if (task.status === 'completed' && task.updated_date) {
      doc.setFont('helvetica', 'bold');
      doc.text('Completed:', margin + 65, infoY);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(task.updated_date), 'MMM dd, yyyy'), margin + 85, infoY);
    }
    
    infoY += 5;

    // Tags
    if (task.tags && task.tags.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Tags:', margin + 3, infoY);
      doc.setFont('helvetica', 'normal');
      doc.text(task.tags.map(t => `#${t}`).join(', '), margin + 15, infoY);
    }

    yPos += 25;

    // Checklist section
    const checklist = task.checklist || task.checklist_items || [];
    if (checklist.length > 0) {
      if (yPos > pageHeight - 60) {
        addFooter();
        doc.addPage();
        addHeader();
        yPos = 28;
      }

      // Section header
      doc.setFillColor(255, 184, 0);
      doc.rect(margin - 5, yPos - 3, 3, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text('Checklist', margin + 2, yPos + 2);
      yPos += 8;

      // Checklist items
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      checklist.forEach((item, idx) => {
        if (yPos > pageHeight - 35) {
          addFooter();
          doc.addPage();
          addHeader();
          yPos = 28;
        }

        // Alternate row background
        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, yPos - 4, contentWidth, 6, 'F');
        }

        // Handle different status formats
        const isCompleted = item.status === 'completed' || item.checked === true;
        const isInProgress = item.status === 'in_progress';
        
        // Checkbox icon - all with white fill and colored border
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.5);
        if (isCompleted) {
          doc.setDrawColor(34, 197, 94);
          doc.circle(margin + 2, yPos - 1.5, 1.5, 'FD');
        } else if (isInProgress) {
          doc.setDrawColor(251, 191, 36);
          doc.circle(margin + 2, yPos - 1.5, 1.5, 'FD');
        } else {
          doc.setDrawColor(239, 68, 68);
          doc.circle(margin + 2, yPos - 1.5, 1.5, 'FD');
        }

        // Item text
        doc.setTextColor(isCompleted ? 100 : 51, 65, 85);
        doc.text(item.text, margin + 6, yPos);
        
        // Assignee badge
        if (isCompleted && (task.assignee_name || task.assigned_to_name)) {
          const assigneeName = (task.assignee_name || task.assigned_to_name).split(' ')[0];
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(`@${assigneeName}`, pageWidth - margin - 20, yPos);
        }
        
        yPos += 6;
      });
      yPos += 8;
    }

    // Activity/Comments section
    const comments = taskComments[task.id] || task.comments || [];
    if (comments.length > 0) {
      if (yPos > pageHeight - 50) {
        addFooter();
        doc.addPage();
        addHeader();
        yPos = 28;
      }

      // Section header
      doc.setFillColor(255, 184, 0);
      doc.rect(margin - 5, yPos - 3, 3, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text('Activity', margin + 2, yPos + 2);
      yPos += 8;

      // Comments
      doc.setFontSize(8);
      comments.slice(0, 5).forEach((comment, idx) => {
        if (yPos > pageHeight - 35) {
          addFooter();
          doc.addPage();
          addHeader();
          yPos = 28;
        }

        // Comment box
        doc.setFillColor(248, 250, 252);
        const commentHeight = 12;
        doc.roundedRect(margin, yPos - 3, contentWidth, commentHeight, 1.5, 1.5, 'F');
        
        // Author and date
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(comment.author_name || 'User', margin + 3, yPos + 2);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const date = format(new Date(comment.created_date), 'MMM dd, hh:mm a');
        doc.text(date, margin + 3, yPos + 6);
        
        // Comment text
        doc.setTextColor(71, 85, 105);
        const commentText = comment.comment || comment.content;
        const wrappedText = doc.splitTextToSize(commentText, contentWidth - 50);
        doc.text(wrappedText[0], margin + 40, yPos + 4);
        
        yPos += commentHeight + 3;
      });
      yPos += 5;
    }

    // Location section
    if (task.pin_x && task.pin_y && task.blueprint_id) {
      const plan = plans.find(p => p.id === task.blueprint_id);
      if (plan && plan.file_url) {
        if (yPos > pageHeight - 40) {
          addFooter();
          doc.addPage();
          addHeader();
          yPos = 28;
        }

        // Section header
        doc.setFillColor(255, 184, 0);
        doc.rect(margin - 5, yPos - 3, 3, 8, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26);
        doc.text('Location on Plan', margin + 2, yPos + 2);
        yPos += 8;

        // Location info box
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(margin, yPos, contentWidth, 10, 1.5, 1.5, 'F');
        doc.setFontSize(9);
        doc.setTextColor(120, 53, 15);
        doc.setFont('helvetica', 'normal');
        doc.text(`Position: ${Math.round(task.pin_x)}%, ${Math.round(task.pin_y)}%  -  Plan: ${plan.name}`, margin + 3, yPos + 6);
        yPos += 15;
      }
    }

    // Photos section
    const taskPhotos = task.photo_urls 
      ? task.photo_urls.map((url, idx) => ({ url, id: `${task.id}-${idx}` }))
      : photos.filter(p => p.task_id === task.id);
    if (taskPhotos.length > 0 && report.include_options?.photos !== false) {
      if (yPos > pageHeight - 35) {
        addFooter();
        doc.addPage();
        addHeader();
        yPos = 28;
      }

      // Section header
      doc.setFillColor(255, 184, 0);
      doc.rect(margin - 5, yPos - 3, 3, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text('Photos', margin + 2, yPos + 2);
      
      // Photo count badge
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin + 25, yPos - 3, 20, 8, 1.5, 1.5, 'F');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`${taskPhotos.length}`, margin + 35, yPos + 2, { align: 'center' });
      yPos += 10;

      // Photo count text
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`${taskPhotos.length} photo${taskPhotos.length > 1 ? 's' : ''} attached to this task`, margin, yPos);
      yPos += 10;

      // Render photo thumbnails
      const photoSize = 55;
      const photosPerRow = 3;
      const photoSpacing = 5;
      let photoX = margin;
      let photoY = yPos;
      let photoCount = 0;

      for (const photo of taskPhotos.slice(0, 9)) {
        if (yPos > pageHeight - photoSize - 25) {
          addFooter();
          doc.addPage();
          addHeader();
          yPos = 28;
          photoY = yPos;
          photoX = margin;
          photoCount = 0;
        }

        try {
          // Draw photo border
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.5);
          doc.rect(photoX, photoY, photoSize, photoSize);
          
          // Add photo to PDF
          const photoUrl = photo.url || photo.file_url;
          if (photoUrl) {
            try {
              doc.addImage(photoUrl, 'JPEG', photoX + 1, photoY + 1, photoSize - 2, photoSize - 2);
            } catch (imgError) {
              // If image fails, show placeholder
              doc.setFontSize(8);
              doc.setTextColor(148, 163, 184);
              doc.text('Photo', photoX + photoSize / 2, photoY + photoSize / 2, { align: 'center' });
            }
          }
        } catch (err) {
          console.warn('Error adding photo:', err);
        }

        photoCount++;
        photoX += photoSize + photoSpacing;

        if (photoCount % photosPerRow === 0) {
          photoX = margin;
          photoY += photoSize + photoSpacing;
          yPos = photoY;
        }
      }

      if (photoCount % photosPerRow !== 0) {
        yPos = photoY + photoSize + photoSpacing;
      }
    }

    addFooter();
  }

  return doc;
}