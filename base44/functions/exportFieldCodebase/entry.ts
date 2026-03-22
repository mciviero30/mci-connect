import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ========================================
    // MCI FIELD COMPLETE EXPORT
    // ========================================
    
    const output = {
      generated: new Date().toISOString(),
      sections: {}
    };

    // ENTITIES
    const fieldEntities = [
      'Job', 'JobAssignment', 'JobFile', 'AssignmentFile',
      'Task', 'TaskComment', 'TaskAttachment', 'TaskTemplate', 'TaskDependency', 'TaskTimeLog', 'TaskHistory',
      'Plan', 'PlanAnnotation',
      'Photo', 'PhotoAnnotation', 'PhotoComparison',
      'Document', 'DocumentFolder', 'DocumentVersion', 'Report',
      'ProjectMember', 'ProjectInvitation', 'ProjectAccessRequest',
      'FormTemplate', 'FormSubmission', 'ChecklistTemplate', 'ScheduledInspection', 'InspectionSubmission',
      'WorkUnit', 'WallTypeTemplate', 'MaterialQRCode',
      'FieldActivityLog', 'ProjectBudget', 'ProjectCost', 'ClientApproval', 'ProjectMilestone',
      'ClientNotificationRule', 'TaskLocationPattern',
      'ChatMessage', 'ChatGroup',
      'WorkflowRule', 'WorkflowLog'
    ];

    const entities = {};
    for (const entityName of fieldEntities) {
      try {
        const schema = await base44.entities[entityName]?.schema?.();
        if (schema) {
          entities[entityName] = schema;
        }
      } catch (e) {
        console.log(`Skipping ${entityName}:`, e.message);
      }
    }
    output.sections.entities = entities;

    // FILE STRUCTURE MAP
    output.sections.file_structure = {
      pages: [
        'pages/Field.jsx',
        'pages/FieldProject.jsx'
      ],
      components: {
        'components/field/': [
          'AccessDenied.jsx',
          'BeforeAfterPhotoManager.jsx',
          'BeforeAfterPhotos.jsx',
          'BlueprintViewer.jsx',
          'ClientApprovalsView.jsx',
          'ClientInvitationManager.jsx',
          'CreateTaskDialog.jsx',
          'DailyReportGenerator.jsx',
          'DimensionBlueprintViewer.jsx',
          'FieldActivityLogView.jsx',
          'FieldAIAssistant.jsx',
          'FieldAnalyticsView.jsx',
          'FieldBudgetView.jsx',
          'FieldChatView.jsx',
          'FieldChecklistsView.jsx',
          'FieldDimensionView.jsx',
          'FieldDocumentsView.jsx',
          'FieldFormsView.jsx',
          'FieldMembersView.jsx',
          'FieldMilestonesView.jsx',
          'FieldOfflineManager.jsx',
          'FieldPhotosView.jsx',
          'FieldPlansView.jsx',
          'FieldProjectOverview.jsx',
          'FieldReportsView.jsx',
          'FieldTasksView.jsx',
          'GlobalChecklistsManager.jsx',
          'InvitationModal.jsx',
          'JobProgress.jsx',
          'LiveCollaborators.jsx',
          'MobileFieldNav.jsx',
          'MobilePhotoCapture.jsx',
          'OfflineSyncIndicator.jsx',
          'OptimalAssigneeSuggestor.jsx',
          'OverdueTasksAlert.jsx',
          'PDFProcessor.jsx',
          'PDFViewerWrapper.jsx',
          'PhotoComparison.jsx',
          'PlanAnalyzer.jsx',
          'ProgressReportGenerator.jsx',
          'ProjectProgressBar.jsx',
          'QRCodeScanner.jsx',
          'QuickSearchDialog.jsx',
          'RealTimeCollaboration.jsx',
          'SmartTaskAssignment.jsx',
          'TaskChecklistEditor.jsx',
          'TaskDependencies.jsx',
          'TaskDetailPanel.jsx',
          'TaskPin.jsx',
          'TaskTimeTracker.jsx',
          'VersionControl.jsx',
          'WallTemplatesManager.jsx',
          'useActivityLog.jsx',
          'AdvancedBlueprintTools.jsx',
          'AILearningEngine.jsx',
          'AITaskSuggestions.jsx'
        ],
        'components/field/hooks/': [
          'useWorkUnits.jsx'
        ],
        'components/client/': [
          'ClientComments.jsx',
          'ClientDriveViewer.jsx',
          'ClientJobOverview.jsx',
          'ClientNotificationEngine.jsx',
          'NotificationRulesManager.jsx',
          'PhotoGalleryEnhanced.jsx'
        ],
        'components/themes/': [
          'ThemeProvider.jsx',
          'designSystem.js',
          'themeUtils.js'
        ]
      },
      functions: [
        'functions/syncJobToMCIField.js',
        'functions/createJobDriveFolder.js',
        'functions/uploadToDrive.js',
        'functions/listDriveFiles.js',
        'functions/notifyClientsOnEvent.js'
      ]
    };

    // INSTRUCTIONS
    output.sections.instructions = `
# MCI FIELD - Complete Codebase Reference

Generated: ${new Date().toISOString()}

## 🎯 What's Included

### ✅ Complete Entity Schemas (${Object.keys(entities).length} entities)
All field-related entities with full JSON schemas

### ✅ File Structure Map
Complete list of all pages, components, and functions

## 📥 How to Access Full Source Code

### Option 1: Base44 Dashboard (Recommended)
1. Open Base44 Dashboard
2. Go to: **Code → Files**
3. Browse/download any file from the structure map

### Option 2: Request Full Export
Ask the AI: "Export complete Field source code"

## 🗂️ MCI Field Architecture

### Pages (2)
- Field.jsx - Main projects list with provisioning
- FieldProject.jsx - Individual project workspace

### Components (50+)
Organized in:
- components/field/ - Core Field UI components
- components/field/hooks/ - Custom React hooks
- components/client/ - Client portal components
- components/themes/ - MCI Field theme system

### Key Features
1. **Project Management**
   - Multi-project dashboard
   - Role-based access control
   - Job provisioning workflow

2. **Task System**
   - WorkUnit entity (unified tasks/checklists)
   - Kanban board with drag & drop
   - Wall-based organization

3. **Media Management**
   - Photo gallery with timeline
   - Before/After comparisons
   - Blueprint viewer with annotations

4. **Collaboration**
   - Real-time chat per project
   - Team member management
   - Client portal access

5. **Offline Support**
   - PWA capabilities
   - Offline data sync
   - Queue system for mutations

## 🔌 Backend Functions (5)
- syncJobToMCIField - Cross-app sync
- createJobDriveFolder - Google Drive integration
- uploadToDrive - File management
- listDriveFiles - Drive file listing
- notifyClientsOnEvent - Client notifications

## 📊 Entity Relationships

### Core Entities
- **Job** - Central project entity
- **WorkUnit** - Unified task/checklist system
- **Plan** - Blueprint/drawing management
- **Photo** - Progress documentation
- **ProjectMember** - Access control

### Supporting Entities
- **FieldActivityLog** - Audit trail
- **ClientApproval** - Client feedback
- **ProjectMilestone** - Progress tracking
- **MaterialQRCode** - Material tracking
- **WallTypeTemplate** - Pre-configured templates

## 🎨 Theme System
MCI Field uses a custom dark theme:
- Orange/Yellow gradient primary colors
- Slate 700-900 backgrounds
- Enhanced mobile touch targets (48px+)
- Offline-first design

## 🔐 Security Model
- Admin: Full access
- Manager: Team-based access
- Employee: Assigned jobs only
- Client: Read-only portal access

## 📱 Mobile Optimizations
- Bottom navigation bar
- Touch-friendly targets (44px+)
- PWA installable
- Offline-capable
- Camera integration

## 🚀 Next Steps
1. Review entity schemas in this export
2. Access full source: Dashboard → Code → Files
3. Deploy to production
4. Monitor via Control Tower

---
MCI Connect • Field Module
Built on Base44 Platform
`;

    return Response.json(output, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mci-field-export-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ 
      error: 'Export failed', 
      details: error.message 
    }, { status: 500 });
  }
});