// ============================================================
// Axiom Build System — Database Types
// Auto-maintained: update when schema changes.
// ============================================================

export type UserRole = 'operations_manager' | 'fitter' | 'manufacturer'
export type KitStatus = 'designing' | 'production' | 'completed' | 'dispatched'
export type BackorderStatus = 'requested' | 'acknowledged' | 'in_production' | 'dispatched' | 'received'
export type BuildStatus = 'pending' | 'kit_designing' | 'kit_production' | 'kit_dispatched' | 'in_progress' | 'waiting_on_parts' | 'waiting_on_compliance' | 'completed' | 'delivered'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'declined'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  pin: string | null
  created_at: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  portal_token: string
  created_at: string
}

export interface Vehicle {
  id: string
  job_id: string
  vin: string | null
  stock_number: string | null
  registration: string | null
  customer_id: string | null
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number | null
  build_type: string
  build_status: BuildStatus
  estimated_completion_date: string | null
  handover_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QrCode {
  id: string
  vehicle_id: string
  token: string
  generated_by: string | null
  generated_at: string
  is_active: boolean
}

export interface Task {
  id: string
  vehicle_id: string
  task_name: string
  task_category: string
  task_order: number
  role_required: UserRole
  is_required: boolean
  photo_required: boolean
  assigned_to: string | null
  completed_by: string | null
  status: TaskStatus
  notes: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
}

export interface TaskTemplate {
  id: string
  build_type: string
  task_name: string
  task_category: string
  task_order: number
  role_required: UserRole
  is_required: boolean
  photo_required: boolean
}

export interface Quotation {
  id: string
  vehicle_id: string
  customer_id: string | null
  created_by: string | null
  total_amount: number
  status: QuotationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  vehicle_id: string
  quotation_id: string | null
  customer_id: string | null
  created_by: string | null
  total_amount: number
  status: InvoiceStatus
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  vehicle_id: string
  document_name: string
  document_type: string
  file_url: string
  uploaded_by: string | null
  uploaded_at: string
}

export interface Photo {
  id: string
  vehicle_id: string
  task_id: string | null
  image_url: string
  uploaded_by: string | null
  is_customer_visible: boolean
  approved_by: string | null
  uploaded_at: string
}

export interface ActivityLog {
  id: string
  vehicle_id: string | null
  task_id: string | null
  user_id: string | null
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  created_at: string
}

export interface KitOrder {
  id: string
  vehicle_id: string
  status: KitStatus
  manufacturer_notes: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface KitBackorder {
  id: string
  kit_type: string
  quantity: number
  status: BackorderStatus
  ops_notes: string | null
  manufacturer_notes: string | null
  created_by: string | null
  received_at: string | null
  created_at: string
  updated_at: string
}

export interface BuildLog {
  id: string
  name: string
  customer_name: string | null
  vehicle_info: string | null
  spec_label: string | null
  rego_vin: string | null
  total_amount: number
  addon_rows: { ticked: boolean; desc: string; price?: number }[] | null
  created_at: string
  updated_at: string
}

// Supabase Database type wrapper (used by createClient<Database>)
export type Database = {
  public: {
    Tables: {
      users:          { Row: User;          Insert: Omit<User, 'created_at'>;          Update: Partial<User> }
      customers:      { Row: Customer;      Insert: Omit<Customer, 'id' | 'portal_token' | 'created_at'>; Update: Partial<Customer> }
      vehicles:       { Row: Vehicle;       Insert: Omit<Vehicle, 'id' | 'job_id' | 'created_at' | 'updated_at'>; Update: Partial<Vehicle> }
      qr_codes:       { Row: QrCode;        Insert: Omit<QrCode, 'id' | 'token' | 'generated_at'>; Update: Partial<QrCode> }
      tasks:          { Row: Task;          Insert: Omit<Task, 'id' | 'created_at'>;   Update: Partial<Task> }
      task_templates: { Row: TaskTemplate;  Insert: Omit<TaskTemplate, 'id'>;          Update: Partial<TaskTemplate> }
      quotations:     { Row: Quotation;     Insert: Omit<Quotation, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Quotation> }
      invoices:       { Row: Invoice;       Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;   Update: Partial<Invoice> }
      documents:      { Row: Document;      Insert: Omit<Document, 'id' | 'uploaded_at'>; Update: Partial<Document> }
      photos:         { Row: Photo;         Insert: Omit<Photo, 'id' | 'uploaded_at'>; Update: Partial<Photo> }
      activity_log:   { Row: ActivityLog;   Insert: Omit<ActivityLog, 'id' | 'created_at'>; Update: never }
      build_logs:     { Row: BuildLog;      Insert: Omit<BuildLog, 'id' | 'created_at' | 'updated_at'>; Update: Partial<BuildLog> }
      kit_orders:      { Row: KitOrder;      Insert: Omit<KitOrder, 'id' | 'created_at' | 'updated_at'>; Update: Partial<KitOrder> }
      kit_backorders:  { Row: KitBackorder; Insert: Omit<KitBackorder, 'id' | 'created_at' | 'updated_at'>; Update: Partial<KitBackorder> }
      invoice_items:   { Row: InvoiceItem;  Insert: Omit<InvoiceItem, 'id' | 'created_at'>; Update: Partial<InvoiceItem> }
    }
    Enums: {
      user_role:        UserRole
      build_status:     BuildStatus
      task_status:      TaskStatus
      quotation_status: QuotationStatus
      invoice_status:   InvoiceStatus
      backorder_status: BackorderStatus
    }
  }
}
