export type RegionCode = 'US' | 'CA' | 'GB' | 'EU' | 'AU' | 'INTL';

export type UserRole =
  | 'Platform Super Admin'
  | 'Organization Owner'
  | 'Organization Admin'
  | 'Property Manager'
  | 'Concierge'
  | 'Cleaning Staff'
  | 'Maintenance Technician'
  | 'Inspector'
  | 'Guest';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  contact_email: string;
  contact_phone: string;
  default_country: RegionCode;
  plan_tier: 'Starter' | 'Professional' | 'Portfolio';
  property_limit: number;
  require_cleaning_approval: number;
  require_pre_arrival_inspection: number;
}

export interface OrgMember {
  membership_id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_initials: string;
  role: UserRole;
  assigned_property_ids_json: string;
  assigned_property_ids?: string[];
  status: string;
  neon_linked?: boolean;
  workload_total?: number;
  workload_completed?: number;
}

export interface SessionContext {
  organizationId: string;
  userId: string;
  actorName: string;
  actorRole: UserRole;
}

export interface ReadinessResult {
  status: 'Ready' | 'Not Ready';
  reason: string;
  gates: {
    incidentsClear: boolean;
    cleaningApproved: boolean;
    inspectionPassed: boolean;
  };
}

export interface Property {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: RegionCode;
  timezone: string;
  currency: 'USD' | 'CAD' | 'GBP' | 'EUR' | 'AUD';
  temp_unit: 'F' | 'C';
  emergency_number: string;
  bedrooms: number;
  bathrooms: number;
  max_occupancy: number;
  cover_image: string;
  description: string;
  amenities: string[];
  parking_info: string;
  access_summary: string;
  emergency_notes: string;
  internal_notes: string;
  operational_status: string;
  readiness_status: 'Ready' | 'Not Ready';
  readiness_reason: string;
  readiness?: ReadinessResult;
  archived: number;
  created_at: string;
}

export interface GuidebookSection {
  id?: string;
  section_key: string;
  title: string;
  is_visible: boolean;
  sort_order: number;
  content: Record<string, any>;
}

export interface Guidebook {
  id?: string;
  property_id?: string;
  brand_name: string;
  accent_color: string;
  typography_style: string;
  cover_image: string;
  section_order: string[];
}

export interface Reservation {
  id: string;
  organization_id: string;
  property_id: string;
  property_name?: string;
  property_slug?: string;
  property_country?: RegionCode;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_count: number;
  check_in_date: string;
  check_out_date: string;
  access_code: string;
  status: string;
  check_in_status: string;
  check_out_status: string;
  special_instructions: string;
  house_rules_acknowledged: number;
  created_at: string;
}

export interface CleaningChecklistItem {
  id: string;
  area: string;
  label: string;
  done: boolean;
}

export interface CleaningTask {
  id: string;
  organization_id: string;
  property_id: string;
  property_name?: string;
  readiness_status?: 'Ready' | 'Not Ready';
  readiness_reason?: string;
  reservation_id: string | null;
  title: string;
  assigned_user_id: string | null;
  assigned_name: string;
  due_date: string;
  status: 'Unassigned' | 'Assigned' | 'In Progress' | 'Submitted for Review' | 'Completed' | 'Rejected' | 'Overdue';
  checklist: CleaningChecklistItem[];
  photo_urls: string[];
  notes: string;
  review_notes: string;
  reviewed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  organization_id: string;
  property_id: string;
  property_name?: string;
  reservation_id: string | null;
  source: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  description: string;
  status: 'Reported' | 'Assigned' | 'In Progress' | 'Awaiting Verification' | 'Resolved' | 'Reopened';
  assigned_to_id: string | null;
  assigned_to_name: string;
  work_order_code: string;
  deadline: string;
  internal_notes: string;
  resolution_notes: string;
  attachment_urls: string[];
  resolution_urls: string[];
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface PropertyAsset {
  id: string;
  property_id: string;
  name: string;
  category: string;
  room_location: string;
  condition: string;
  notes: string;
  replacement_cost: number;
}
