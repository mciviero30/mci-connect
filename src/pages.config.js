/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy, Suspense } from 'react';
const AIAssistantPersonal = lazy(() => import('./pages/AIAssistantPersonal'));
const AIScheduleCenter = lazy(() => import('./pages/AIScheduleCenter'));
const AdminCleanup = lazy(() => import('./pages/AdminCleanup'));
const AdvancedAnalytics = lazy(() => import('./pages/AdvancedAnalytics'));
const AgingReport = lazy(() => import('./pages/AgingReport'));
const AgreementSignatures = lazy(() => import('./pages/AgreementSignatures'));
const ApprovalsHub = lazy(() => import('./pages/ApprovalsHub'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const BankSync = lazy(() => import('./pages/BankSync'));
const BonusConfiguration = lazy(() => import('./pages/BonusConfiguration'));
const BudgetForecasting = lazy(() => import('./pages/BudgetForecasting'));
const CEOSetup = lazy(() => import('./pages/CEOSetup'));
const Calendario = lazy(() => import('./pages/Calendario'));
const Capacitacion = lazy(() => import('./pages/Capacitacion'));
const CashFlowReport = lazy(() => import('./pages/CashFlowReport'));
const ChangeOrders = lazy(() => import('./pages/ChangeOrders'));
const Chat = lazy(() => import('./pages/Chat'));
const ClientAppDemo = lazy(() => import('./pages/ClientAppDemo'));
const ClientApprovals = lazy(() => import('./pages/ClientApprovals'));
const ClientManagement = lazy(() => import('./pages/ClientManagement'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const ClientProfitabilityReport = lazy(() => import('./pages/ClientProfitabilityReport'));
const Clientes = lazy(() => import('./pages/Clientes'));
const CodebaseExport = lazy(() => import('./pages/CodebaseExport'));
const CommissionAgreements = lazy(() => import('./pages/CommissionAgreements'));
const CommissionDashboard = lazy(() => import('./pages/CommissionDashboard'));
const CommissionManagement = lazy(() => import('./pages/CommissionManagement'));
const CommissionReports = lazy(() => import('./pages/CommissionReports'));
const CommissionReview = lazy(() => import('./pages/CommissionReview'));
const CommissionRuleManagement = lazy(() => import('./pages/CommissionRuleManagement'));
const CommissionSimulator = lazy(() => import('./pages/CommissionSimulator'));
const CommissionTotalsGusto = lazy(() => import('./pages/CommissionTotalsGusto'));
const CompanyInfo = lazy(() => import('./pages/CompanyInfo'));
const CompanySettings = lazy(() => import('./pages/CompanySettings'));
const ComplianceHub = lazy(() => import('./pages/ComplianceHub'));
const ComplianceReviewHub = lazy(() => import('./pages/ComplianceReviewHub'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Contabilidad = lazy(() => import('./pages/Contabilidad'));
const CrearChangeOrder = lazy(() => import('./pages/CrearChangeOrder'));
const CrearEstimado = lazy(() => import('./pages/CrearEstimado'));
const CrearFactura = lazy(() => import('./pages/CrearFactura'));
const CrearIncidente = lazy(() => import('./pages/CrearIncidente'));
const CrossAppSync = lazy(() => import('./pages/CrossAppSync'));
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'));
import Dashboard from './pages/Dashboard';
const Directory = lazy(() => import('./pages/Directory'));
const DocumentSignatures = lazy(() => import('./pages/DocumentSignatures'));
const EditarEstimado = lazy(() => import('./pages/EditarEstimado'));
const Empleados = lazy(() => import('./pages/Empleados'));
const EmployeeBenefits = lazy(() => import('./pages/EmployeeBenefits'));
const EmployeeDataAudit = lazy(() => import('./pages/EmployeeDataAudit'));
const EmployeeImport = lazy(() => import('./pages/EmployeeImport'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const Estimados = lazy(() => import('./pages/Estimados'));
const ExecutiveControlTower = lazy(() => import('./pages/ExecutiveControlTower'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const FactoryView = lazy(() => import('./pages/FactoryView'));
const Facturas = lazy(() => import('./pages/Facturas'));
const Field = lazy(() => import('./pages/Field'));
const FieldExport = lazy(() => import('./pages/FieldExport'));
const FieldMeasurements = lazy(() => import('./pages/FieldMeasurements'));
const FieldProgressDashboard = lazy(() => import('./pages/FieldProgressDashboard'));
const FieldProject = lazy(() => import('./pages/FieldProject'));
const Formularios = lazy(() => import('./pages/Formularios'));
const Gastos = lazy(() => import('./pages/Gastos'));
const GeocodeJobs = lazy(() => import('./pages/GeocodeJobs'));
const GoLivePlaybook = lazy(() => import('./pages/GoLivePlaybook'));
const Goals = lazy(() => import('./pages/Goals'));
import Home from './pages/Home';
const Horarios = lazy(() => import('./pages/Horarios'));
const HorasManejo = lazy(() => import('./pages/HorasManejo'));
const IntegrationsStatus = lazy(() => import('./pages/IntegrationsStatus'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Items = lazy(() => import('./pages/Items'));
const JobDetails = lazy(() => import('./pages/JobDetails'));
const JobPerformanceAnalysis = lazy(() => import('./pages/JobPerformanceAnalysis'));
const JobPhotos = lazy(() => import('./pages/JobPhotos'));
const JobQuoteCleanup = lazy(() => import('./pages/JobQuoteCleanup'));
const JobTimeline = lazy(() => import('./pages/JobTimeline'));
const KnowledgeAdmin = lazy(() => import('./pages/KnowledgeAdmin'));
const KnowledgeLibrary = lazy(() => import('./pages/KnowledgeLibrary'));
const KnowledgeSubmit = lazy(() => import('./pages/KnowledgeSubmit'));
const LiveGPSTracking = lazy(() => import('./pages/LiveGPSTracking'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const Manejo = lazy(() => import('./pages/Manejo'));
const MarginCommissionAnalyzer = lazy(() => import('./pages/MarginCommissionAnalyzer'));
const Measurement = lazy(() => import('./pages/Measurement'));
const MeasurementPackage = lazy(() => import('./pages/MeasurementPackage'));
const MiScorecard = lazy(() => import('./pages/MiScorecard'));
const MileageApproval = lazy(() => import('./pages/MileageApproval'));
const MisGastos = lazy(() => import('./pages/MisGastos'));
const MisHoras = lazy(() => import('./pages/MisHoras'));
const MisProyectos = lazy(() => import('./pages/MisProyectos'));
const MyCommissions = lazy(() => import('./pages/MyCommissions'));
const MyPayroll = lazy(() => import('./pages/MyPayroll'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const NewsFeed = lazy(() => import('./pages/NewsFeed'));
const Nomina = lazy(() => import('./pages/Nomina'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
import OnboardingWizard from './pages/OnboardingWizard';
const OperationalModesDoc = lazy(() => import('./pages/OperationalModesDoc'));
const OrphanedQuoteCleanup = lazy(() => import('./pages/OrphanedQuoteCleanup'));
const Papelera = lazy(() => import('./pages/Papelera'));
const PaymentReconciliation = lazy(() => import('./pages/PaymentReconciliation'));
import PaymentSuccess from './pages/PaymentSuccess';
const PayrollAutoFlow = lazy(() => import('./pages/PayrollAutoFlow'));
const PayrollDashboard = lazy(() => import('./pages/PayrollDashboard'));
const PerDiem = lazy(() => import('./pages/PerDiem'));
const PayrollImportLedger = lazy(() => import('./pages/PayrollImportLedger'));
const payrollimportledgerV2 = lazy(() => import('./pages/PayrollImportLedger_v2'));
const PerformanceManagement = lazy(() => import('./pages/PerformanceManagement'));
const ProfitabilityDashboard = lazy(() => import('./pages/ProfitabilityDashboard'));
const QuickBooksExport = lazy(() => import('./pages/QuickBooksExport'));
const QuoteImporter = lazy(() => import('./pages/QuoteImporter'));
const RFIs = lazy(() => import('./pages/RFIs'));
const Recognitions = lazy(() => import('./pages/Recognitions'));
const RecurringInvoices = lazy(() => import('./pages/RecurringInvoices'));
const Reportes = lazy(() => import('./pages/Reportes'));
const ReportingHub = lazy(() => import('./pages/ReportingHub'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const SafetyIncidents = lazy(() => import('./pages/SafetyIncidents'));
import SetupPassword from './pages/SetupPassword';
const SignDocument = lazy(() => import('./pages/SignDocument'));
const SkillMatrix = lazy(() => import('./pages/SkillMatrix'));
const Submittals = lazy(() => import('./pages/Submittals'));
const SystemDiagnostics = lazy(() => import('./pages/SystemDiagnostics'));
const SystemHealthCheck = lazy(() => import('./pages/SystemHealthCheck'));
const SystemReadiness = lazy(() => import('./pages/SystemReadiness'));
const TMInvoiceBuilder = lazy(() => import('./pages/TMInvoiceBuilder'));
import TaxOnboarding from './pages/TaxOnboarding';
const TeamDetails = lazy(() => import('./pages/TeamDetails'));
const TeamGoals = lazy(() => import('./pages/TeamGoals'));
const TeamUtilizationReport = lazy(() => import('./pages/TeamUtilizationReport'));
const Teams = lazy(() => import('./pages/Teams'));
const TimeOffRequests = lazy(() => import('./pages/TimeOffRequests'));
const TimeReports = lazy(() => import('./pages/TimeReports'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const Trabajos = lazy(() => import('./pages/Trabajos'));
const TravelBookings = lazy(() => import('./pages/TravelBookings'));
const TwoFactorSettings = lazy(() => import('./pages/TwoFactorSettings'));
const VerChangeOrder = lazy(() => import('./pages/VerChangeOrder'));
const VerEstimado = lazy(() => import('./pages/VerEstimado'));
const VerFactura = lazy(() => import('./pages/VerFactura'));
const VerIncidente = lazy(() => import('./pages/VerIncidente'));
const VerRFI = lazy(() => import('./pages/VerRFI'));
const VerSubmittal = lazy(() => import('./pages/VerSubmittal'));
import WelcomeMessage from './pages/WelcomeMessage';
const WorkAuthorizations = lazy(() => import('./pages/WorkAuthorizations'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistantPersonal": AIAssistantPersonal,
    "AIScheduleCenter": AIScheduleCenter,
    "AdminCleanup": AdminCleanup,
    "AdvancedAnalytics": AdvancedAnalytics,
    "AgingReport": AgingReport,
    "AgreementSignatures": AgreementSignatures,
    "ApprovalsHub": ApprovalsHub,
    "AuditTrail": AuditTrail,
    "BankSync": BankSync,
    "BonusConfiguration": BonusConfiguration,
    "BudgetForecasting": BudgetForecasting,
    "CEOSetup": CEOSetup,
    "Calendario": Calendario,
    "Capacitacion": Capacitacion,
    "CashFlowReport": CashFlowReport,
    "ChangeOrders": ChangeOrders,
    "Chat": Chat,
    "ClientAppDemo": ClientAppDemo,
    "ClientApprovals": ClientApprovals,
    "ClientManagement": ClientManagement,
    "ClientPortal": ClientPortal,
    "ClientProfitabilityReport": ClientProfitabilityReport,
    "Clientes": Clientes,
    "CodebaseExport": CodebaseExport,
    "CommissionAgreements": CommissionAgreements,
    "CommissionDashboard": CommissionDashboard,
    "CommissionManagement": CommissionManagement,
    "CommissionReports": CommissionReports,
    "CommissionReview": CommissionReview,
    "CommissionRuleManagement": CommissionRuleManagement,
    "CommissionSimulator": CommissionSimulator,
    "CommissionTotalsGusto": CommissionTotalsGusto,
    "CompanyInfo": CompanyInfo,
    "CompanySettings": CompanySettings,
    "ComplianceHub": ComplianceHub,
    "ComplianceReviewHub": ComplianceReviewHub,
    "Configuracion": Configuracion,
    "Contabilidad": Contabilidad,
    "CrearChangeOrder": CrearChangeOrder,
    "CrearEstimado": CrearEstimado,
    "CrearFactura": CrearFactura,
    "CrearIncidente": CrearIncidente,
    "CrossAppSync": CrossAppSync,
    "CustomerDetails": CustomerDetails,
    "Dashboard": Dashboard,
    "Directory": Directory,
    "DocumentSignatures": DocumentSignatures,
    "EditarEstimado": EditarEstimado,
    "Empleados": Empleados,
    "EmployeeBenefits": EmployeeBenefits,
    "EmployeeDataAudit": EmployeeDataAudit,
    "EmployeeImport": EmployeeImport,
    "EmployeeProfile": EmployeeProfile,
    "Estimados": Estimados,
    "ExecutiveControlTower": ExecutiveControlTower,
    "ExecutiveDashboard": ExecutiveDashboard,
    "FactoryView": FactoryView,
    "Facturas": Facturas,
    "Field": Field,
    "FieldExport": FieldExport,
    "FieldMeasurements": FieldMeasurements,
    "FieldProgressDashboard": FieldProgressDashboard,
    "FieldProject": FieldProject,
    "Formularios": Formularios,
    "Gastos": Gastos,
    "GeocodeJobs": GeocodeJobs,
    "GoLivePlaybook": GoLivePlaybook,
    "Goals": Goals,
    "Home": Home,
    "Horarios": Horarios,
    "HorasManejo": HorasManejo,
    "IntegrationsStatus": IntegrationsStatus,
    "Inventario": Inventario,
    "Items": Items,
    "JobDetails": JobDetails,
    "JobPerformanceAnalysis": JobPerformanceAnalysis,
    "JobPhotos": JobPhotos,
    "JobQuoteCleanup": JobQuoteCleanup,
    "JobTimeline": JobTimeline,
    "KnowledgeAdmin": KnowledgeAdmin,
    "KnowledgeLibrary": KnowledgeLibrary,
    "KnowledgeSubmit": KnowledgeSubmit,
    "LiveGPSTracking": LiveGPSTracking,
    "ManagerDashboard": ManagerDashboard,
    "Manejo": Manejo,
    "MarginCommissionAnalyzer": MarginCommissionAnalyzer,
    "Measurement": Measurement,
    "MeasurementPackage": MeasurementPackage,
    "MiScorecard": MiScorecard,
    "MileageApproval": MileageApproval,
    "MisGastos": MisGastos,
    "MisHoras": MisHoras,
    "MisProyectos": MisProyectos,
    "MyCommissions": MyCommissions,
    "MyPayroll": MyPayroll,
    "MyProfile": MyProfile,
    "NewsFeed": NewsFeed,
    "Nomina": Nomina,
    "NotificationCenter": NotificationCenter,
    "NotificationPreferences": NotificationPreferences,
    "NotificationSettings": NotificationSettings,
    "OnboardingWizard": OnboardingWizard,
    "OperationalModesDoc": OperationalModesDoc,
    "OrphanedQuoteCleanup": OrphanedQuoteCleanup,
    "Papelera": Papelera,
    "PaymentReconciliation": PaymentReconciliation,
    "PaymentSuccess": PaymentSuccess,
    "PayrollAutoFlow": PayrollAutoFlow,
    "PayrollDashboard": PayrollDashboard,
    "PerDiem": PerDiem,
    "PayrollImportLedger": PayrollImportLedger,
    "PayrollImportLedger_v2": payrollimportledgerV2,
    "PerformanceManagement": PerformanceManagement,
    "ProfitabilityDashboard": ProfitabilityDashboard,
    "QuickBooksExport": QuickBooksExport,
    "QuoteImporter": QuoteImporter,
    "RFIs": RFIs,
    "Recognitions": Recognitions,
    "RecurringInvoices": RecurringInvoices,
    "Reportes": Reportes,
    "ReportingHub": ReportingHub,
    "RoleManagement": RoleManagement,
    "SafetyIncidents": SafetyIncidents,
    "SetupPassword": SetupPassword,
    "SignDocument": SignDocument,
    "SkillMatrix": SkillMatrix,
    "Submittals": Submittals,
    "SystemDiagnostics": SystemDiagnostics,
    "SystemHealthCheck": SystemHealthCheck,
    "SystemReadiness": SystemReadiness,
    "TMInvoiceBuilder": TMInvoiceBuilder,
    "TaxOnboarding": TaxOnboarding,
    "TeamDetails": TeamDetails,
    "TeamGoals": TeamGoals,
    "TeamUtilizationReport": TeamUtilizationReport,
    "Teams": Teams,
    "TimeOffRequests": TimeOffRequests,
    "TimeReports": TimeReports,
    "TimeTracking": TimeTracking,
    "Trabajos": Trabajos,
    "TravelBookings": TravelBookings,
    "TwoFactorSettings": TwoFactorSettings,
    "VerChangeOrder": VerChangeOrder,
    "VerEstimado": VerEstimado,
    "VerFactura": VerFactura,
    "VerIncidente": VerIncidente,
    "VerRFI": VerRFI,
    "VerSubmittal": VerSubmittal,
    "WelcomeMessage": WelcomeMessage,
    "WorkAuthorizations": WorkAuthorizations,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};