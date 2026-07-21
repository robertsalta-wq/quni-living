import { lazy } from 'react'

/** Shared dynamic import() factories — used by React.lazy and route prefetch. */
export const routeImports = {
  authCallback: () => import('./pages/auth/AuthCallback'),
  forgotPassword: () => import('./pages/ForgotPassword'),
  resetPassword: () => import('./pages/ResetPassword'),
  verifyEmail: () => import('./pages/VerifyEmail'),
  signup: () => import('./pages/Signup'),
  studentSignup: () => import('./pages/StudentSignup'),
  landlordSignup: () => import('./pages/LandlordSignup'),
  onboarding: () => import('./pages/Onboarding'),
  studentOnboarding: () => import('./pages/onboarding/StudentOnboarding'),
  landlordOnboarding: () => import('./pages/onboarding/LandlordOnboarding'),
  studentDashboard: () => import('./pages/StudentDashboard'),
  landlordDashboard: () => import('./pages/LandlordDashboard'),
  studentProfile: () => import('./pages/StudentProfile'),
  booking: () => import('./pages/Booking'),
  sampleAgreementsPage: () => import('./pages/SampleAgreementsPage'),
  inviteTenantPage: () => import('./pages/InviteTenantPage'),
  landlordPropertyFormPage: () => import('./pages/landlord/LandlordPropertyFormPage'),
  landlordListingEditHubPage: () => import('./pages/landlord/LandlordListingEditHubPage'),
  landlordListingEditEntry: () => import('./pages/landlord/LandlordListingEditEntry'),
  landlordBookingReviewPage: () => import('./pages/landlord/LandlordBookingReviewPage'),
  messagesPage: () => import('./pages/MessagesPage'),
  /** @deprecated — re-exports MessagesPage */
  messagesInboxPage: () => import('./pages/MessagesInboxPage'),
  /** @deprecated — re-exports MessagesPage */
  conversationThreadPage: () => import('./pages/ConversationThreadPage'),
  home: () => import('./pages/Home'),
  listings: () => import('./pages/Listings'),
  propertyDetail: () => import('./pages/PropertyDetail'),
  login: () => import('./pages/Login'),
  rentNearCampus: () => import('./pages/RentNearCampus'),
  internationalStudents: () => import('./pages/InternationalStudents'),
  about: () => import('./pages/About'),
  howItWorks: () => import('./pages/HowItWorks'),
  refunds: () => import('./pages/Refunds'),
  pricing: () => import('./pages/Pricing'),
  contact: () => import('./pages/Contact'),
  faq: () => import('./pages/Faq'),
  verification: () => import('./pages/Verification'),
  services: () => import('./pages/Services'),
  serviceStudentAccommodation: () => import('./pages/services/StudentAccommodation'),
  servicePropertyManagement: () => import('./pages/services/PropertyManagement'),
  serviceLandlordPartnerships: () => import('./pages/services/LandlordPartnerships'),
  serviceFullyFurnished: () => import('./pages/services/FullyFurnished'),
  terms: () => import('./pages/Terms'),
  privacy: () => import('./pages/Privacy'),
  nonDiscrimination: () => import('./pages/NonDiscrimination'),
  landlordServiceAgreement: () => import('./pages/LandlordServiceAgreement'),
  landlordAIFeaturePage: () => import('./pages/LandlordAIFeaturePage'),
  studentAccommodationIndex: () => import('./pages/seo/StudentAccommodationIndex'),
  universityAccommodation: () => import('./pages/seo/UniversityAccommodation'),
  campusAccommodation: () => import('./pages/seo/CampusAccommodation'),
  adminLayout: () => import('./pages/admin/AdminLayout'),
  livingConsole: () => import('./pages/admin/LivingConsole'),
  adminKitchen: () => import('./pages/admin/AdminKitchen'),
  bookingsPage: () => import('./pages/admin/BookingsPage'),
  adminServiceTierEvents: () => import('./pages/admin/AdminServiceTierEvents'),
  adminEnquiries: () => import('./pages/admin/AdminEnquiries'),
  adminLandlordLeads: () => import('./pages/admin/AdminLandlordLeads'),
  adminProperties: () => import('./pages/admin/AdminProperties'),
  adminStudents: () => import('./pages/admin/AdminStudents'),
  adminDocumentAccessLog: () => import('./pages/admin/AdminDocumentAccessLog'),
  adminSupportLookup: () => import('./pages/admin/AdminSupportLookup'),
  adminLandlords: () => import('./pages/admin/AdminLandlords'),
  adminApps: () => import('./pages/admin/AdminApps'),
  adminPayments: () => import('./pages/admin/AdminPayments'),
  adminSettings: () => import('./pages/admin/AdminSettings'),
  adminTeam: () => import('./pages/admin/AdminTeam'),
  pricingPage: () => import('./pages/admin/PricingPage'),
  knowledgeBase: () => import('./pages/admin/KnowledgeBase'),
  documentsPage: () => import('./pages/admin/DocumentsPage'),
  agreementPreviewsPage: () => import('./pages/admin/AgreementPreviewsPage'),
  domainsPage: () => import('./pages/admin/DomainsPage'),
  trustChecklist: () => import('./pages/admin/TrustChecklist'),
  adminStateWorkflows: () => import('./pages/admin/AdminStateWorkflows'),
  qaseTicketList: () => import('./pages/admin/QaseTicketList'),
  qaseTicketDetail: () => import('./pages/admin/QaseTicketDetail'),
  qaseSettings: () => import('./pages/admin/QaseSettings'),
} as const

/** Heavy / infrequent routes - loaded on demand to shrink the initial bundle. */

// Auth & onboarding
export const AuthCallback = lazy(routeImports.authCallback)
export const ForgotPassword = lazy(routeImports.forgotPassword)
export const ResetPassword = lazy(routeImports.resetPassword)
export const VerifyEmail = lazy(routeImports.verifyEmail)
export const Signup = lazy(routeImports.signup)
export const StudentSignup = lazy(routeImports.studentSignup)
export const LandlordSignup = lazy(routeImports.landlordSignup)
export const Onboarding = lazy(routeImports.onboarding)
export const StudentOnboarding = lazy(routeImports.studentOnboarding)
export const LandlordOnboarding = lazy(routeImports.landlordOnboarding)

// Dashboards & account
export const StudentDashboard = lazy(routeImports.studentDashboard)
export const LandlordDashboard = lazy(routeImports.landlordDashboard)
export const StudentProfile = lazy(routeImports.studentProfile)
export const Booking = lazy(routeImports.booking)
export const SampleAgreementsPage = lazy(routeImports.sampleAgreementsPage)

export const InviteTenantPage = lazy(routeImports.inviteTenantPage)

// Landlord tools
export const LandlordPropertyFormPage = lazy(routeImports.landlordPropertyFormPage)
export const LandlordListingEditHubPage = lazy(routeImports.landlordListingEditHubPage)
export const LandlordListingEditEntry = lazy(routeImports.landlordListingEditEntry)
export const LandlordBookingReviewPage = lazy(routeImports.landlordBookingReviewPage)

// Messaging
export const MessagesPage = lazy(routeImports.messagesPage)
/** @deprecated Use MessagesPage */
export const MessagesInboxPage = lazy(routeImports.messagesInboxPage)
/** @deprecated Use MessagesPage */
export const ConversationThreadPage = lazy(routeImports.conversationThreadPage)

// Marketing & SEO (primary + secondary)
export const Home = lazy(routeImports.home)
export const Listings = lazy(routeImports.listings)
export const PropertyDetail = lazy(routeImports.propertyDetail)
export const Login = lazy(routeImports.login)
export const RentNearCampus = lazy(routeImports.rentNearCampus)
export const InternationalStudents = lazy(routeImports.internationalStudents)
export const About = lazy(routeImports.about)
export const HowItWorks = lazy(routeImports.howItWorks)
export const Refunds = lazy(routeImports.refunds)
export const Pricing = lazy(routeImports.pricing)
export const Contact = lazy(routeImports.contact)
export const Faq = lazy(routeImports.faq)
export const Verification = lazy(routeImports.verification)
export const Services = lazy(routeImports.services)
export const ServiceStudentAccommodation = lazy(routeImports.serviceStudentAccommodation)
export const ServicePropertyManagement = lazy(routeImports.servicePropertyManagement)
export const ServiceLandlordPartnerships = lazy(routeImports.serviceLandlordPartnerships)
export const ServiceFullyFurnished = lazy(routeImports.serviceFullyFurnished)
export const Terms = lazy(routeImports.terms)
export const Privacy = lazy(routeImports.privacy)
export const NonDiscrimination = lazy(routeImports.nonDiscrimination)
export const LandlordServiceAgreement = lazy(routeImports.landlordServiceAgreement)
export const LandlordAIFeaturePage = lazy(routeImports.landlordAIFeaturePage)
export const StudentAccommodationIndex = lazy(routeImports.studentAccommodationIndex)
export const UniversityAccommodation = lazy(routeImports.universityAccommodation)
export const CampusAccommodation = lazy(routeImports.campusAccommodation)

// Admin shell + pages
export const AdminLayout = lazy(routeImports.adminLayout)
export const LivingConsole = lazy(routeImports.livingConsole)
export const AdminKitchen = lazy(routeImports.adminKitchen)
export const BookingsPage = lazy(routeImports.bookingsPage)
export const AdminServiceTierEvents = lazy(routeImports.adminServiceTierEvents)
export const AdminEnquiries = lazy(routeImports.adminEnquiries)
export const AdminLandlordLeads = lazy(routeImports.adminLandlordLeads)
export const AdminProperties = lazy(routeImports.adminProperties)
export const AdminStudents = lazy(routeImports.adminStudents)
export const AdminDocumentAccessLog = lazy(routeImports.adminDocumentAccessLog)
export const AdminSupportLookup = lazy(routeImports.adminSupportLookup)
export const AdminLandlords = lazy(routeImports.adminLandlords)
export const AdminApps = lazy(routeImports.adminApps)
export const AdminPayments = lazy(routeImports.adminPayments)
export const AdminSettings = lazy(routeImports.adminSettings)
export const AdminTeam = lazy(routeImports.adminTeam)
export const PricingPage = lazy(routeImports.pricingPage)
export const KnowledgeBase = lazy(routeImports.knowledgeBase)
export const DocumentsPage = lazy(routeImports.documentsPage)
export const AgreementPreviewsPage = lazy(routeImports.agreementPreviewsPage)
export const DomainsPage = lazy(routeImports.domainsPage)
export const TrustChecklist = lazy(routeImports.trustChecklist)
export const AdminStateWorkflows = lazy(routeImports.adminStateWorkflows)
export const QaseTicketList = lazy(routeImports.qaseTicketList)
export const QaseTicketDetail = lazy(routeImports.qaseTicketDetail)
export const QaseSettings = lazy(routeImports.qaseSettings)
