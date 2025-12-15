import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export async function generateProgressReportPDF(report, job, tasks, photos, plans, user) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
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

  // Helper: Add footer
  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Progress Report pg. ${pageNumber} Created with MCI Field on ${format(new Date(), 'MM-dd-yyyy')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
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
    if (task.checklist_items && task.checklist_items.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Checklist', margin, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      task.checklist_items.forEach((item) => {
        const checkbox = item.checked ? '☑' : '☐';
        const itemText = `${checkbox} ${item.text}`;
        const assignee = item.checked && task.assigned_to_name ? ` (@${task.assigned_to_name.split(' ')[0]} - ${format(new Date(item.completed_date || task.updated_date), 'MM-dd-yyyy')})` : '';
        
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
    if (task.comments && task.comments.length > 0) {
      if (yPos > pageHeight - 40) {
        addFooter();
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Task messages (time in EST)', margin, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      task.comments.slice(0, 5).forEach((comment) => {
        const commentText = `${comment.author_name || 'User'} - ${comment.content}`;
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

    // Photos
    const taskPhotos = photos.filter(p => p.task_id === task.id);
    if (taskPhotos.length > 0 && report.include_options?.photos) {
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

      for (let j = 0; j < Math.min(taskPhotos.length, 9); j++) {
        const photo = taskPhotos[j];
        const col = photoCount % photosPerRow;
        const row = Math.floor(photoCount / photosPerRow);
        
        const xPos = margin + col * (photoSize + 5);
        const currentYPos = rowYPos + row * (photoSize + 8);

        if (currentYPos + photoSize > pageHeight - 30) {
          addFooter();
          doc.addPage();
          rowYPos = margin;
          photoCount = 0;
        }

        try {
          if (photo.url) {
            doc.addImage(photo.url, 'JPEG', xPos, rowYPos + row * (photoSize + 8), photoSize, photoSize);
          }
          
          // Photo number
          doc.setFontSize(7);
          doc.setTextColor(100);
          doc.text(`${j + 1}`, xPos + photoSize / 2, rowYPos + row * (photoSize + 8) + photoSize + 4, { align: 'center' });
        } catch (error) {
          console.warn('Could not add image:', error);
          doc.setFillColor(240);
          doc.rect(xPos, rowYPos + row * (photoSize + 8), photoSize, photoSize, 'F');
          doc.setFontSize(8);
          doc.text('Image', xPos + photoSize / 2, rowYPos + row * (photoSize + 8) + photoSize / 2, { align: 'center' });
        }

        photoCount++;
      }

      yPos = rowYPos + Math.ceil(Math.min(taskPhotos.length, 9) / photosPerRow) * (photoSize + 8) + 5;
    }

    addFooter();
  }

  return doc;
}