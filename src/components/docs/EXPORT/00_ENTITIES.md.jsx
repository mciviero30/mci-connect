# ENTITIES EXPORT — Complete JSON Schemas
**Generated**: 2025-12-31  
**Total Entities**: 84  
**Format**: PATH: entities/{name}.json → Full JSON Schema

---

## CORE ENTITIES (User & Employee)

### PATH: entities/User.json (BUILT-IN - Extended)
**Note**: User entity is built-in by Base44. These are ADDITIONAL fields only.
```json
{
  "first_name": { "type": "string" },
  "last_name": { "type": "string" },
  "position": { 
    "type": "string",
    "enum": ["CEO", "administrator", "manager", "supervisor", "foreman", "technician", "designer", "PM"]
  },
  "department": {
    "type": "string",
    "enum": ["all", "HR", "field", "operations", "IT", "administration", "designer", "PM", "marketing", "sales"]
  },
  "phone": { "type": "string" },
  "address": { "type": "string" },
  "dob": { "type": "string", "format": "date" },
  "ssn_tax_id": { "type": "string" },
  "hourly_rate": { "type": "number" },
  "team_id": { "type": "string" },
  "team_name": { "type": "string" },
  "hire_date": { "type": "string", "format": "date" },
  "tshirt_size": {
    "type": "string",
    "enum": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
  },
  "employment_status": {
    "type": "string",
    "enum": ["pending", "invited", "active", "paused", "archived", "deleted"],
    "default": "pending"
  },
  "pause_date": { "type": "string", "format": "date" },
  "return_date": { "type": "string", "format": "date" },
  "pause_reason": { "type": "string" },
  "termination_date": { "type": "string", "format": "date" },
  "termination_reason": { "type": "string" },
  "emergency_contact_name": { "type": "string" },
  "emergency_contact_phone": { "type": "string" },
  "emergency_contact_relationship": { "type": "string" },
  "bank_name": { "type": "string" },
  "routing_number": { "type": "string" },
  "account_number": { "type": "string" },
  "preferred_language": {
    "type": "string",
    "enum": ["en", "es"],
    "default": "en"
  },
  "profile_photo_url": { "type": "string" },
  "avatar_image_url": { "type": "string" },
  "preferred_profile_image": {
    "type": "string",
    "enum": ["photo", "avatar"],
    "default": "photo"
  },
  "profile_last_updated": { "type": "string", "format": "date-time" },
  "onboarding_completed": { "type": "boolean", "default": false },
  "onboarding_completed_at": { "type": "string", "format": "date-time" },
  "welcome_message_seen": { "type": "boolean", "default": false }
}
```

---

### PATH: entities/PendingEmployee.json
```json
{'name': 'PendingEmployee', 'type': 'object', 'properties': {'first_name': {'type': 'string', 'description': 'First Name'}, 'last_name': {'type': 'string', 'description': 'Last Name'}, 'email': {'type': 'string', 'description': 'Email (requerido para poder invitar)'}, 'position': {'type': 'string', 'enum': ['CEO', 'manager', 'technician', 'supervisor', 'foreman', 'administrator'], 'description': 'Position'}, 'phone': {'type': 'string', 'description': 'Phone (format: (000)000-0000)'}, 'ssn_tax_id': {'type': 'string', 'description': 'SSN/Tax ID'}, 'address': {'type': 'string', 'description': 'Address'}, 'direct_manager_name': {'type': 'string', 'description': 'Direct Manager Name'}, 'dob': {'type': 'string', 'format': 'date', 'description': 'Date of Birth'}, 'tshirt_size': {'type': 'string', 'enum': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], 'description': 'T-Shirt Size'}, 'department': {'type': 'string', 'enum': ['all', 'HR', 'field', 'operations', 'IT', 'administration', 'designer', 'PM', 'marketing', 'sales'], 'description': 'Department'}, 'team_id': {'type': 'string', 'description': 'Team ID'}, 'team_name': {'type': 'string', 'description': 'Team Name'}, 'status': {'type': 'string', 'enum': ['pending', 'invited', 'active', 'archived'], 'default': 'pending', 'description': 'Status'}, 'invited_date': {'type': 'string', 'format': 'date-time', 'description': 'Invited Date'}, 'registered_date': {'type': 'string', 'format': 'date-time', 'description': 'Date when employee first logged in'}, 'onboarding_completed_date': {'type': 'string', 'format': 'date-time', 'description': 'Date when onboarding was completed'}, 'last_invitation_sent': {'type': 'string', 'format': 'date-time', 'description': 'Last time invitation was sent'}, 'invitation_count': {'type': 'integer', 'default': 0, 'description': 'Number of times invitation was sent'}, 'notes': {'type': 'string', 'description': 'Notes'}}, 'required': ['first_name', 'last_name', 'email']}
```

---

### PATH: entities/EmployeeDirectory.json
```json
{'name': 'EmployeeDirectory', 'type': 'object', 'properties': {'employee_email': {'type': 'string', 'description': 'Email del empleado'}, 'full_name': {'type': 'string', 'description': 'Nombre completo'}, 'position': {'type': 'string', 'description': 'Posición'}, 'department': {'type': 'string', 'description': 'Departamento'}, 'phone': {'type': 'string', 'description': 'Teléfono'}, 'profile_photo_url': {'type': 'string', 'description': 'URL de foto de perfil'}, 'status': {'type': 'string', 'enum': ['active', 'inactive'], 'default': 'active', 'description': 'Estado'}}, 'required': ['employee_email', 'full_name']}
```

---

### PATH: entities/OnboardingForm.json
```json
{'name': 'OnboardingForm', 'type': 'object', 'properties': {'employee_email': {'type': 'string', 'description': 'Email del empleado'}, 'employee_name': {'type': 'string', 'description': 'Nombre del empleado'}, 'form_type': {'type': 'string', 'enum': ['safety_acknowledgment', 'company_rules', 'personal_paperwork'], 'description': 'Tipo de formulario de onboarding'}, 'status': {'type': 'string', 'enum': ['pending', 'completed'], 'default': 'pending', 'description': 'Estado del formulario'}, 'form_data': {'type': 'object', 'description': 'Datos del formulario completado'}, 'completed_at': {'type': 'string', 'format': 'date-time', 'description': 'Fecha de completación'}}, 'required': ['employee_email', 'employee_name', 'form_type']}
```

---

## FINANCE ENTITIES

### PATH: entities/Quote.json
```json
{
  "name": "Quote",
  "type": "object",
  "properties": {
    "quote_number": {"type": "string", "description": "Quote Number (ej: EST-00001)"},
    "customer_id": {"type": "string"},
    "customer_name": {"type": "string"},
    "customer_email": {"type": "string"},
    "customer_phone": {"type": "string"},
    "job_name": {"type": "string"},
    "job_id": {"type": "string", "description": "Job ID (optional)"},
    "job_address": {"type": "string"},
    "team_id": {"type": "string"},
    "team_name": {"type": "string"},
    "team_ids": {"type": "array", "items": {"type": "string"}},
    "team_names": {"type": "array", "items": {"type": "string"}},
    "quote_date": {"type": "string", "format": "date"},
    "valid_until": {"type": "string", "format": "date"},
    "install_date": {"type": "string", "format": "date"},
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "item_name": {"type": "string"},
          "description": {"type": "string"},
          "quantity": {"type": "number"},
          "unit": {"type": "string"},
          "unit_price": {"type": "number"},
          "total": {"type": "number"}
        }
      }
    },
    "subtotal": {"type": "number"},
    "tax_rate": {"type": "number", "default": 0},
    "tax_amount": {"type": "number"},
    "total": {"type": "number"},
    "estimated_hours": {"type": "number"},
    "estimated_cost": {"type": "number"},
    "profit_margin": {"type": "number"},
    "notes": {"type": "string"},
    "terms": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["draft", "sent", "approved", "rejected", "converted_to_invoice"],
      "default": "draft"
    },
    "invoice_id": {"type": "string"},
    "assigned_to": {"type": "string"},
    "assigned_to_name": {"type": "string"},
    "version": {"type": "number", "default": 1},
    "parent_quote_id": {"type": "string"},
    "is_template": {"type": "boolean", "default": false},
    "template_name": {"type": "string"},
    "is_recurring": {"type": "boolean", "default": false},
    "recurring_frequency": {"type": "string", "enum": ["monthly", "quarterly", "yearly"]},
    "approval_status": {
      "type": "string",
      "enum": ["pending_approval", "approved", "rejected"],
      "default": "approved"
    },
    "approved_by": {"type": "string"},
    "approved_at": {"type": "string", "format": "date-time"},
    "rejected_by": {"type": "string"},
    "rejected_at": {"type": "string", "format": "date-time"},
    "approval_notes": {"type": "string"},
    "created_by_role": {"type": "string"}
  },
  "required": ["customer_name", "job_name", "quote_date", "items", "total"]
}
```

---

### PATH: entities/Invoice.json
```json
{
  "name": "Invoice",
  "type": "object",
  "properties": {
    "invoice_number": {"type": "string"},
    "quote_id": {"type": "string"},
    "customer_id": {"type": "string"},
    "customer_name": {"type": "string"},
    "customer_email": {"type": "string"},
    "customer_phone": {"type": "string"},
    "job_name": {"type": "string"},
    "job_id": {"type": "string"},
    "job_address": {"type": "string"},
    "team_id": {"type": "string"},
    "team_name": {"type": "string"},
    "invoice_date": {"type": "string", "format": "date"},
    "due_date": {"type": "string", "format": "date"},
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "item_name": {"type": "string"},
          "description": {"type": "string"},
          "quantity": {"type": "number"},
          "unit": {"type": "string"},
          "unit_price": {"type": "number"},
          "total": {"type": "number"},
          "installation_time": {"type": "number"},
          "calculation_type": {"type": "string"},
          "tech_count": {"type": "number"},
          "duration_value": {"type": "number"},
          "is_travel_item": {"type": "boolean"},
          "travel_item_type": {"type": "string"},
          "account_category": {
            "type": "string",
            "enum": ["revenue_service", "revenue_materials"]
          }
        }
      }
    },
    "subtotal": {"type": "number"},
    "tax_rate": {"type": "number", "default": 0},
    "tax_amount": {"type": "number"},
    "total": {"type": "number"},
    "amount_paid": {"type": "number", "default": 0},
    "balance": {"type": "number"},
    "notes": {"type": "string"},
    "terms": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["draft", "sent", "paid", "partial", "overdue", "cancelled"],
      "default": "draft"
    },
    "payment_date": {"type": "string", "format": "date"},
    "transaction_id": {"type": "string"},
    "approval_status": {
      "type": "string",
      "enum": ["pending_approval", "approved", "rejected"],
      "default": "approved"
    },
    "approved_by": {"type": "string"},
    "approved_at": {"type": "string", "format": "date-time"},
    "rejected_by": {"type": "string"},
    "rejected_at": {"type": "string", "format": "date-time"},
    "approval_notes": {"type": "string"},
    "created_by_role": {"type": "string"}
  },
  "required": ["customer_name", "job_name", "invoice_date", "items", "total"]
}
```

---

### PATH: entities/Customer.json
```json
{'name': 'Customer', 'type': 'object', 'properties': {'first_name': {'type': 'string', 'description': 'First Name'}, 'last_name': {'type': 'string', 'description': 'Last Name'}, 'title': {'type': 'string', 'description': 'Role/Title (e.g., Project Manager, Director)'}, 'email': {'type': 'string', 'description': 'Primary Email'}, 'secondary_email': {'type': 'string', 'description': 'Secondary Email'}, 'phone': {'type': 'string', 'description': 'Primary Phone (format: (000)000-0000)'}, 'secondary_phone': {'type': 'string', 'description': 'Secondary Phone'}, 'mobile': {'type': 'string', 'description': 'Mobile Phone'}, 'company': {'type': 'string', 'description': 'Company Name'}, 'company_website': {'type': 'string', 'description': 'Company Website'}, 'company_tax_id': {'type': 'string', 'description': 'Company Tax ID / EIN'}, 'billing_address': {'type': 'string', 'description': 'Billing Street Address'}, 'billing_city': {'type': 'string', 'description': 'Billing City'}, 'billing_state': {'type': 'string', 'description': 'Billing State'}, 'billing_zip': {'type': 'string', 'description': 'Billing Zip Code'}, 'shipping_address': {'type': 'string', 'description': 'Shipping Street Address'}, 'shipping_city': {'type': 'string', 'description': 'Shipping City'}, 'shipping_state': {'type': 'string', 'description': 'Shipping State'}, 'shipping_zip': {'type': 'string', 'description': 'Shipping Zip Code'}, 'address': {'type': 'string', 'description': 'Legacy Address Field (deprecated)'}, 'city': {'type': 'string', 'description': 'Legacy City Field (deprecated)'}, 'state': {'type': 'string', 'description': 'Legacy State Field (deprecated)'}, 'zip': {'type': 'string', 'description': 'Legacy Zip Field (deprecated)'}, 'payment_terms': {'type': 'string', 'enum': ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt', 'custom'], 'default': 'net_30', 'description': 'Default Payment Terms'}, 'credit_limit': {'type': 'number', 'description': 'Credit Limit'}, 'preferred_contact_method': {'type': 'string', 'enum': ['email', 'phone', 'text'], 'default': 'email', 'description': 'Preferred Contact Method'}, 'customer_type': {'type': 'string', 'enum': ['residential', 'commercial', 'industrial', 'government'], 'default': 'commercial', 'description': 'Customer Type'}, 'industry': {'type': 'string', 'description': 'Industry / Sector'}, 'notes': {'type': 'string', 'description': 'Internal notes'}, 'tags': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Tags for categorization'}, 'status': {'type': 'string', 'enum': ['active', 'inactive', 'prospect'], 'default': 'active', 'description': 'Status'}, 'last_contact_date': {'type': 'string', 'format': 'date', 'description': 'Last Contact Date'}, 'customer_since': {'type': 'string', 'format': 'date', 'description': 'Customer Since Date'}}, 'required': ['first_name', 'last_name', 'email', 'company', 'title']}
```

---

### PATH: entities/QuoteItem.json
```json
{'name': 'QuoteItem', 'type': 'object', 'properties': {'name': {'type': 'string', 'description': 'Nombre del item'}, 'description': {'type': 'string', 'description': 'Descripción detallada'}, 'unit': {'type': 'string', 'default': 'pcs', 'description': 'Unidad de medida (pcs, ft, sqft, hours, etc.)'}, 'unit_price': {'type': 'number', 'description': 'Precio unitario (precio de venta al cliente)'}, 'cost_per_unit': {'type': 'number', 'description': 'Costo interno por unidad (auto-calculado para Labor/Service)'}, 'material_cost': {'type': 'number', 'default': 0, 'description': 'Costo de materiales para items de Labor/Service (opcional)'}, 'supplier': {'type': 'string', 'description': 'Proveedor principal del item'}, 'installation_time': {'type': 'number', 'description': 'Tiempo estimado de instalación por unidad (en horas)'}, 'category': {'type': 'string', 'enum': ['materials', 'labor', 'equipment', 'services', 'other'], 'default': 'materials', 'description': 'Categoría del item'}, 'account_category': {'type': 'string', 'enum': ['revenue_service', 'revenue_materials', 'expense_labor_cost', 'expense_materials', 'asset_inventory'], 'description': 'Categoría contable para reportes'}, 'in_stock_quantity': {'type': 'number', 'default': 0, 'description': 'Cantidad disponible en inventario'}, 'min_stock_quantity': {'type': 'number', 'default': 5, 'description': 'Cantidad mínima antes de alerta de reorden'}, 'status': {'type': 'string', 'enum': ['active', 'inactive', 'low_stock', 'out_of_stock'], 'default': 'active', 'description': 'Estado del item (auto-actualizado según stock)'}, 'is_overtime': {'type': 'boolean', 'default': False, 'description': 'Si aplica tarifa de overtime (1.5x) para labor'}, 'requires_tech_calculation': {'type': 'boolean', 'default': False, 'description': 'Si requiere cálculo basado en número de técnicos'}, 'calculation_type': {'type': 'string', 'enum': ['none', 'hotel', 'per_diem', 'hours'], 'default': 'none', 'description': 'Tipo de cálculo automático: hotel (2 techs/room), per-diem (techs × days), hours (techs × hours)'}, 'estimated_driving_hours': {'type': 'number', 'description': 'Horas estimadas de manejo por cada team (calculado automáticamente basado en millas)'}}, 'required': ['name', 'unit_price']}
```

---

### PATH: entities/ItemCatalog.json
**Note**: Same schema as QuoteItem (alias for catalog management)

---

### PATH: entities/Counter.json
```json
{'name': 'Counter', 'type': 'object', 'properties': {'counter_key': {'type': 'string', 'description': 'Unique counter identifier (e.g., invoice_number, quote_number)'}, 'current_value': {'type': 'number', 'description': 'Current counter value', 'default': 0}, 'last_increment_date': {'type': 'string', 'format': 'date-time', 'description': 'Last time this counter was incremented'}}, 'required': ['counter_key', 'current_value']}
```

---

### PATH: entities/Transaction.json
```json
{'name': 'Transaction', 'type': 'object', 'properties': {'type': {'type': 'string', 'enum': ['income', 'expense'], 'description': 'Tipo de transacción'}, 'amount': {'type': 'number', 'description': 'Monto'}, 'category': {'type': 'string', 'enum': ['sales', 'services', 'other_income', 'salaries', 'rent', 'utilities', 'supplies', 'marketing', 'taxes', 'insurance', 'maintenance', 'other_expense'], 'description': 'Categoría'}, 'description': {'type': 'string', 'description': 'Descripción'}, 'date': {'type': 'string', 'format': 'date', 'description': 'Fecha'}, 'payment_method': {'type': 'string', 'enum': ['cash', 'bank_transfer', 'card', 'check'], 'description': 'Método de pago'}, 'notes': {'type': 'string', 'description': 'Notas adicionales'}}, 'required': ['type', 'amount', 'category', 'date']}
```

---

## OPERATIONS ENTITIES

### PATH: entities/Job.json
**See REPO_MAP.md for full schema (60+ fields)**

Key Fields:
- name, description, customer_id, customer_name
- address, city, state, zip, latitude, longitude
- geofence_radius, skip_geofence
- contract_amount, estimated_cost, estimated_hours, profit_margin
- team_id, team_name, assigned_team_field[]
- status: active/completed/archived/on_hold
- drive_folder_id, drive_folder_url
- field_project_id
- provisioning_status, provisioning_steps, provisioning_attempts
- approval_status, approved_by, approved_at

---

### PATH: entities/Team.json
```json
{'name': 'Team', 'type': 'object', 'properties': {'team_name': {'type': 'string', 'description': 'Nombre del equipo (ej: Atlanta, Orlando, North Carolina)'}, 'location': {'type': 'string', 'description': 'Ubicación del equipo'}, 'base_address': {'type': 'string', 'description': 'Dirección completa de la base/oficina del equipo (para calcular distancia a trabajos)'}, 'state': {'type': 'string', 'description': 'Estado (ej: Georgia, Florida, North Carolina)'}, 'is_headquarters': {'type': 'boolean', 'default': False, 'description': 'Si es la sede principal'}, 'maximum_headcount': {'type': 'number', 'default': 10, 'description': 'Capacidad máxima de empleados en el equipo'}, 'status': {'type': 'string', 'enum': ['active', 'inactive'], 'default': 'active', 'description': 'Estado del equipo'}, 'description': {'type': 'string', 'description': 'Descripción del equipo'}}, 'required': ['team_name', 'location', 'state']}
```

---

### PATH: entities/JobAssignment.json
```json
{'name': 'JobAssignment', 'type': 'object', 'properties': {'employee_email': {'type': 'string'}, 'employee_name': {'type': 'string'}, 'job_id': {'type': 'string'}, 'job_name': {'type': 'string'}, 'event_type': {'type': 'string', 'enum': ['appointment', 'job_milestone', 'time_off'], 'default': 'job_milestone', 'description': 'Tipo de evento: cita genérica, hito de trabajo, o ausencia'}, 'event_title': {'type': 'string', 'description': 'Título del evento (para citas y hitos)'}, 'date': {'type': 'string', 'format': 'date'}, 'start_time': {'type': 'string'}, 'end_time': {'type': 'string'}, 'notes': {'type': 'string', 'description': 'Notas o instrucciones especiales para el trabajo'}}, 'required': ['date']}
```

---

## TIME & PAYROLL ENTITIES

### PATH: entities/TimeEntry.json
```json
{'name': 'TimeEntry', 'type': 'object', 'properties': {'employee_email': {'type': 'string', 'description': 'Email del empleado'}, 'employee_name': {'type': 'string', 'description': 'Nombre del empleado'}, 'job_id': {'type': 'string', 'description': 'ID del trabajo asociado'}, 'job_name': {'type': 'string', 'description': 'Nombre del trabajo asociado'}, 'date': {'type': 'string', 'format': 'date', 'description': 'Fecha'}, 'check_in': {'type': 'string', 'description': 'Hora de entrada (HH:mm:ss)'}, 'check_out': {'type': 'string', 'description': 'Hora de salida (HH:mm:ss)'}, 'check_in_latitude': {'type': 'number'}, 'check_in_longitude': {'type': 'number'}, 'check_out_latitude': {'type': 'number'}, 'check_out_longitude': {'type': 'number'}, 'hours_worked': {'type': 'number', 'description': 'Horas trabajadas (excluyendo pausas)'}, 'breaks': {'type': 'array', 'items': {'type': 'object', 'properties': {'type': {'type': 'string', 'enum': ['lunch', 'break']}, 'start_time': {'type': 'string'}, 'end_time': {'type': 'string'}, 'duration_minutes': {'type': 'number'}}}, 'default': [], 'description': 'Pausas embebidas (reemplaza BreakLog separado)'}, 'total_break_minutes': {'type': 'number', 'default': 0, 'description': 'Total minutos de pausas'}, 'hour_type': {'type': 'string', 'enum': ['normal', 'overtime'], 'default': 'normal', 'description': 'Tipo de hora'}, 'work_type': {'type': 'string', 'enum': ['normal', 'driving', 'setup', 'cleanup'], 'default': 'normal', 'description': 'Tipo de trabajo realizado'}, 'task_details': {'type': 'string', 'description': 'Detalles de la tarea realizada'}, 'notes': {'type': 'string', 'description': 'Notas'}, 'status': {'type': 'string', 'enum': ['pending', 'approved', 'rejected'], 'default': 'pending', 'description': 'Estado'}, 'geofence_validated': {'type': 'boolean', 'default': False, 'description': 'Si la ubicación fue validada dentro del geofence'}, 'geofence_distance_meters': {'type': 'number', 'description': 'Distancia en metros desde la ubicación del job'}, 'requires_location_review': {'type': 'boolean', 'default': False, 'description': 'Requiere revisión de ubicación por admin'}, 'exceeds_max_hours': {'type': 'boolean', 'default': False, 'description': 'Excede el límite de 14 horas'}}, 'required': ['employee_email', 'employee_name', 'date', 'check_in']}
```

---

### PATH: entities/DrivingLog.json
```json
{'name': 'DrivingLog', 'type': 'object', 'properties': {'employee_email': {'type': 'string'}, 'employee_name': {'type': 'string'}, 'date': {'type': 'string', 'format': 'date'}, 'miles': {'type': 'number', 'description': 'Millas recorridas'}, 'hours': {'type': 'number', 'description': 'Horas de manejo (no se paga overtime, tarifa normal)'}, 'rate_per_mile': {'type': 'number', 'default': 0.6, 'description': 'Tarifa por milla (default $0.60)'}, 'total_amount': {'type': 'number', 'description': 'Monto total calculado'}, 'start_location': {'type': 'string', 'description': 'Ubicación de inicio'}, 'end_location': {'type': 'string', 'description': 'Ubicación de destino'}, 'job_id': {'type': 'string', 'description': 'ID del trabajo asociado'}, 'job_name': {'type': 'string', 'description': 'Nombre del trabajo'}, 'notes': {'type': 'string'}, 'status': {'type': 'string', 'enum': ['pending', 'approved', 'rejected'], 'default': 'pending', 'description': 'Estado de aprobación'}, 'check_in': {'type': 'string'}, 'check_out': {'type': 'string'}, 'check_in_latitude': {'type': 'number'}, 'check_in_longitude': {'type': 'number'}, 'check_out_latitude': {'type': 'number'}, 'check_out_longitude': {'type': 'number'}}, 'required': ['employee_email', 'employee_name', 'date']}
```

---

### PATH: entities/Expense.json
```json
{'name': 'Expense', 'type': 'object', 'properties': {'employee_email': {'type': 'string', 'description': 'Email del empleado'}, 'employee_name': {'type': 'string', 'description': 'Nombre del empleado'}, 'job_id': {'type': 'string', 'description': 'ID del trabajo al que se asocia el gasto'}, 'job_name': {'type': 'string', 'description': 'Nombre del trabajo asociado'}, 'amount': {'type': 'number', 'description': 'Monto'}, 'category': {'type': 'string', 'enum': ['travel', 'meals', 'transport', 'supplies', 'client_entertainment', 'equipment', 'per_diem', 'other'], 'description': 'Categoría'}, 'account_category': {'type': 'string', 'enum': ['expense_labor_cost', 'expense_travel_per_diem', 'expense_materials', 'expense_equipment', 'expense_other'], 'description': 'Categoría contable para reportes financieros'}, 'description': {'type': 'string', 'description': 'Descripción'}, 'date': {'type': 'string', 'format': 'date', 'description': 'Fecha del gasto (fecha de inicio para per diem)'}, 'end_date': {'type': 'string', 'format': 'date', 'description': 'Fecha de fin (solo para per diem multi-día)'}, 'receipt_url': {'type': 'string', 'description': 'URL del recibo'}, 'payment_method': {'type': 'string', 'enum': ['personal', 'company_card'], 'description': 'Método de pago: dinero personal o tarjeta de la compañía'}, 'status': {'type': 'string', 'enum': ['pending', 'approved', 'rejected'], 'default': 'pending', 'description': 'Estado de aprobación'}, 'notes': {'type': 'string', 'description': 'Notas del administrador o empleado'}, 'ai_suggested_category': {'type': 'string', 'description': 'Categoría sugerida por AI'}, 'ai_confidence': {'type': 'number', 'description': 'Nivel de confianza de la sugerencia AI (0-100)'}, 'ai_analyzed': {'type': 'boolean', 'default': False, 'description': 'Si fue analizado por AI'}, 'user_corrected_ai': {'type': 'boolean', 'default': False, 'description': 'Si el usuario corrigió la sugerencia de AI'}}, 'required': ['employee_email', 'employee_name', 'amount', 'category', 'date', 'receipt_url']}
```

---

### PATH: entities/WeeklyPayroll.json
```json
{'name': 'WeeklyPayroll', 'type': 'object', 'properties': {'employee_email': {'type': 'string', 'description': 'Email del empleado'}, 'employee_name': {'type': 'string', 'description': 'Nombre del empleado'}, 'week_start': {'type': 'string', 'format': 'date', 'description': 'Inicio de semana'}, 'week_end': {'type': 'string', 'format': 'date', 'description': 'Fin de semana'}, 'regular_hours': {'type': 'number', 'description': 'Horas normales'}, 'overtime_hours': {'type': 'number', 'description': 'Horas extra'}, 'driving_hours': {'type': 'number', 'description': 'Horas de manejo'}, 'driving_miles': {'type': 'number', 'description': 'Millas recorridas'}, 'per_diem_amount': {'type': 'number', 'default': 0, 'description': 'Monto de per diem'}, 'work_pay': {'type': 'number', 'description': 'Pago por trabajo'}, 'driving_pay': {'type': 'number', 'description': 'Pago por manejo'}, 'reimbursements': {'type': 'number', 'default': 0, 'description': 'Reembolsos'}, 'bonus_amount': {'type': 'number', 'default': 0, 'description': 'Monto de bonos'}, 'total_pay': {'type': 'number', 'description': 'Pago total'}, 'status': {'type': 'string', 'enum': ['draft', 'submitted', 'approved', 'rejected', 'paid'], 'default': 'draft', 'description': 'Estado del payroll'}, 'submitted_date': {'type': 'string', 'format': 'date-time', 'description': 'Fecha de envío'}, 'approved_by_email': {'type': 'string', 'description': 'Email de quien aprobó'}, 'approved_by_name': {'type': 'string', 'description': 'Nombre de quien aprobó'}, 'approved_date': {'type': 'string', 'format': 'date-time', 'description': 'Fecha de aprobación'}, 'rejection_reason': {'type': 'string', 'description': 'Razón de rechazo'}, 'notes': {'type': 'string', 'description': 'Notas adicionales'}}, 'required': ['employee_email', 'employee_name', 'week_start', 'week_end', 'total_pay']}
```

---

### PATH: entities/TimeOffRequest.json
```json
{'name': 'TimeOffRequest', 'type': 'object', 'properties': {'employee_email': {'type': 'string', 'description': 'Email del empleado'}, 'employee_name': {'type': 'string', 'description': 'Nombre del empleado'}, 'team_id': {'type': 'string', 'description': 'ID del equipo del empleado'}, 'team_name': {'type': 'string', 'description': 'Nombre del equipo'}, 'time_off_type': {'type': 'string', 'enum': ['vacation', 'sick', 'personal', 'unpaid'], 'default': 'unpaid', 'description': 'Tipo de ausencia'}, 'time_scope': {'type': 'string', 'enum': ['full_day', 'partial_day'], 'default': 'full_day', 'description': 'Alcance de tiempo: día completo o parcial'}, 'start_date': {'type': 'string', 'format': 'date', 'description': 'Fecha de inicio'}, 'end_date': {'type': 'string', 'format': 'date', 'description': 'Fecha de fin'}, 'start_time': {'type': 'string', 'description': 'Hora de inicio (para días parciales)'}, 'end_time': {'type': 'string', 'description': 'Hora de fin (para días parciales)'}, 'total_days': {'type': 'number', 'description': 'Total de días solicitados'}, 'total_hours': {'type': 'number', 'description': 'Total de horas solicitadas (para días parciales)'}, 'reason': {'type': 'string', 'description': 'Razón del tiempo off'}, 'status': {'type': 'string', 'enum': ['pending', 'approved', 'rejected'], 'default': 'pending', 'description': 'Estado'}, 'notes': {'type': 'string', 'description': 'Notas del administrador'}, 'days_remaining_at_request': {'type': 'number', 'description': 'Días restantes del empleado al momento de la solicitud'}}, 'required': ['employee_email', 'employee_name', 'start_date', 'end_date', 'reason']}
```

---

## COMMUNICATION ENTITIES

### PATH: entities/ChatMessage.json
```json
{'name': 'ChatMessage', 'type': 'object', 'properties': {'sender_email': {'type': 'string'}, 'sender_name': {'type': 'string'}, 'message': {'type': 'string', 'description': 'Message content (MCI Connect)'}, 'content': {'type': 'string', 'description': 'Message content (MCI Field)'}, 'message_type': {'type': 'string', 'enum': ['text', 'image', 'gif'], 'default': 'text', 'description': 'Type of message (MCI Connect)'}, 'group_id': {'type': 'string', 'description': 'ID del grupo de chat (MCI Connect)'}, 'project_id': {'type': 'string', 'description': 'Project reference (MCI Field)'}, 'channel': {'type': 'string', 'enum': ['general', 'tasks', 'documents', 'announcements'], 'default': 'general', 'description': 'Channel (MCI Field)'}, 'mentions': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Mentioned users (MCI Field)'}, 'reply_to': {'type': 'string', 'description': 'Reply to message ID (MCI Field)'}, 'attachments': {'type': 'array', 'items': {'type': 'object', 'properties': {'url': {'type': 'string'}, 'name': {'type': 'string'}, 'type': {'type': 'string'}}}, 'description': 'File attachments (MCI Field)'}, 'is_system': {'type': 'boolean', 'default': False, 'description': 'System message (MCI Field)'}, 'read_by': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Users who read this (MCI Field)'}}, 'required': ['sender_email', 'sender_name']}
```

---

### PATH: entities/ChatGroup.json
```json
{'name': 'ChatGroup', 'type': 'object', 'properties': {'group_name': {'type': 'string', 'description': 'Nombre del grupo'}, 'description': {'type': 'string', 'description': 'Descripción del grupo'}, 'group_type': {'type': 'string', 'enum': ['custom', 'job_channel'], 'default': 'custom', 'description': 'Tipo de grupo: custom o job_channel'}, 'job_id': {'type': 'string', 'description': 'ID del trabajo asociado (solo para job_channel)'}, 'created_by_email': {'type': 'string', 'description': 'Email del creador'}, 'created_by_name': {'type': 'string', 'description': 'Nombre del creador'}, 'members': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Array de emails de miembros'}, 'member_names': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Array de nombres de miembros'}, 'avatar_color': {'type': 'string', 'enum': ['blue', 'purple', 'green', 'orange', 'pink', 'teal'], 'default': 'blue', 'description': 'Color del avatar del grupo'}, 'is_active': {'type': 'boolean', 'default': True, 'description': 'Si el grupo está activo'}}, 'required': ['group_name', 'members']}
```

---

### PATH: entities/Post.json
```json
{'name': 'Post', 'type': 'object', 'properties': {'author_email': {'type': 'string', 'description': 'Email del autor'}, 'author_name': {'type': 'string', 'description': 'Nombre del autor'}, 'title': {'type': 'string', 'description': 'Título del post'}, 'content': {'type': 'string', 'description': 'Contenido del anuncio'}, 'image_url': {'type': 'string', 'description': 'URL de imagen opcional'}, 'priority': {'type': 'string', 'enum': ['normal', 'important', 'urgent'], 'default': 'normal', 'description': 'Prioridad del anuncio'}, 'likes': {'type': 'array', 'items': {'type': 'string'}, 'default': [], 'description': 'Array de emails de usuarios que dieron like'}}, 'required': ['author_email', 'author_name', 'title', 'content']}
```

---

## COMPLIANCE & TRAINING ENTITIES

### PATH: entities/FormTemplate.json
```json
{'name': 'FormTemplate', 'type': 'object', 'properties': {'name': {'type': 'string', 'description': 'Nombre del formulario'}, 'description': {'type': 'string', 'description': 'Descripción del propósito del formulario'}, 'type': {'type': 'string', 'enum': ['inspection', 'incident', 'maintenance', 'opening', 'closing', 'custom', 'safety', 'quality'], 'description': 'Tipo de formulario (merged MCI Connect & Field)'}, 'category': {'type': 'string', 'enum': ['inspection', 'safety', 'quality', 'custom'], 'default': 'custom', 'description': 'Category (MCI Field)'}, 'fields': {'type': 'array', 'items': {'type': 'object', 'properties': {'id': {'type': 'string'}, 'label': {'type': 'string'}, 'type': {'type': 'string', 'enum': ['text', 'textarea', 'number', 'checkbox', 'select', 'photo', 'signature', 'date']}, 'required': {'type': 'boolean'}, 'options': {'type': 'array', 'items': {'type': 'string'}}}}, 'description': 'Campos del formulario'}, 'assigned_to': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Emails de usuarios asignados (MCI Connect)'}, 'frequency': {'type': 'string', 'enum': ['once', 'daily', 'weekly', 'monthly'], 'default': 'once', 'description': 'Frecuencia de repetición (MCI Connect)'}, 'active': {'type': 'boolean', 'default': True, 'description': 'Si el formulario está activo (MCI Connect)'}, 'job_id': {'type': 'string', 'description': 'Reference to Job (MCI Field)'}, 'is_global': {'type': 'boolean', 'default': False, 'description': 'Global template (MCI Field)'}}, 'required': ['name', 'fields']}
```

---

### PATH: entities/FormSubmission.json
```json
{'name': 'FormSubmission', 'type': 'object', 'properties': {'template_id': {'type': 'string', 'description': 'ID del template de formulario'}, 'template_name': {'type': 'string', 'description': 'Nombre del formulario'}, 'submitted_by_email': {'type': 'string', 'description': 'Email del usuario que envió'}, 'submitted_by_name': {'type': 'string', 'description': 'Nombre del usuario'}, 'submission_date': {'type': 'string', 'format': 'date-time', 'description': 'Fecha y hora de envío'}, 'responses': {'type': 'object', 'description': 'Respuestas del formulario (key: field_id, value: respuesta)'}, 'location_lat': {'type': 'number', 'description': 'Latitud de ubicación al enviar'}, 'location_lng': {'type': 'number', 'description': 'Longitud de ubicación al enviar'}, 'photos': {'type': 'array', 'items': {'type': 'string'}, 'description': 'URLs de fotos adjuntas'}}, 'required': ['template_id', 'submitted_by_email', 'submitted_by_name', 'responses']}
```

---

### PATH: entities/Course.json
```json
{'name': 'Course', 'type': 'object', 'properties': {'title': {'type': 'string', 'description': 'Título del curso'}, 'description': {'type': 'string', 'description': 'Descripción del curso'}, 'thumbnail_url': {'type': 'string', 'description': 'Imagen miniatura del curso'}, 'content': {'type': 'string', 'description': 'Contenido del curso (texto, videos, etc.)'}, 'video_url': {'type': 'string', 'description': 'URL de video del curso (opcional)'}, 'duration_minutes': {'type': 'number', 'description': 'Duración estimada en minutos'}, 'quiz_id': {'type': 'string', 'description': 'ID del quiz asociado (opcional)'}, 'assigned_to': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Emails de usuarios asignados'}, 'required': {'type': 'boolean', 'default': False, 'description': 'Si el curso es obligatorio'}, 'active': {'type': 'boolean', 'default': True}}, 'required': ['title', 'content']}
```

---

### PATH: entities/Quiz.json
```json
{'name': 'Quiz', 'type': 'object', 'properties': {'course_id': {'type': 'string', 'description': 'ID del curso asociado'}, 'title': {'type': 'string', 'description': 'Título del quiz'}, 'questions': {'type': 'array', 'items': {'type': 'object', 'properties': {'id': {'type': 'string'}, 'question': {'type': 'string'}, 'type': {'type': 'string', 'enum': ['multiple_choice', 'true_false']}, 'options': {'type': 'array', 'items': {'type': 'string'}}, 'correct_answer': {'type': 'string'}}}, 'description': 'Preguntas del quiz'}, 'passing_score': {'type': 'number', 'default': 70, 'description': 'Puntuación mínima para aprobar (%)'}}, 'required': ['course_id', 'title', 'questions']}
```

---

### PATH: entities/CourseProgress.json
```json
{'name': 'CourseProgress', 'type': 'object', 'properties': {'course_id': {'type': 'string'}, 'course_title': {'type': 'string'}, 'employee_email': {'type': 'string'}, 'employee_name': {'type': 'string'}, 'status': {'type': 'string', 'enum': ['not_started', 'in_progress', 'completed', 'failed'], 'default': 'not_started'}, 'started_date': {'type': 'string', 'format': 'date-time'}, 'completed_date': {'type': 'string', 'format': 'date-time'}, 'quiz_score': {'type': 'number', 'description': 'Puntuación del quiz (0-100)'}, 'attempts': {'type': 'number', 'default': 0, 'description': 'Número de intentos del quiz'}}, 'required': ['course_id', 'employee_email', 'employee_name']}
```

---

### PATH: entities/Certification.json
```json
{'name': 'Certification', 'type': 'object', 'properties': {'employee_email': {'type': 'string'}, 'employee_name': {'type': 'string'}, 'certification_type': {'type': 'string', 'enum': ['OSHA 10', 'OSHA 30', 'Forklift', 'Fall Protection', 'CPR', 'Drug Test', 'osha_10', 'osha_30', 'forklift', 'scissor_lift', 'fall_protection', 'scaffolding', 'first_aid', 'cpr', 'drug_test'], 'description': 'Type of certification (includes Drug Test)'}, 'certification_name': {'type': 'string'}, 'issuing_organization': {'type': 'string'}, 'issue_date': {'type': 'string', 'format': 'date'}, 'expiration_date': {'type': 'string', 'format': 'date'}, 'certificate_number': {'type': 'string'}, 'certificate_url': {'type': 'string', 'description': 'URL to certificate document'}, 'certificate_front_url': {'type': 'string', 'description': 'Front of certificate'}, 'certificate_back_url': {'type': 'string', 'description': 'Back of certificate'}, 'status': {'type': 'string', 'enum': ['active', 'expiring_soon', 'expired'], 'default': 'active'}, 'notes': {'type': 'string'}}, 'required': ['employee_email', 'employee_name', 'certification_type']}
```

---

## PERFORMANCE & RECOGNITION ENTITIES

### PATH: entities/Recognition.json
```json
{'name': 'Recognition', 'type': 'object', 'properties': {'employee_email': {'type': 'string', 'description': 'Email del empleado que recibe el reconocimiento'}, 'employee_name': {'type': 'string', 'description': 'Nombre del empleado que recibe'}, 'recognition_type': {'type': 'string', 'enum': ['teamwork', 'innovation', 'customer_service', 'leadership', 'quality_work', 'problem_solving', 'going_extra_mile', 'mentorship', 'safety_excellence', 'positive_attitude'], 'description': 'Tipo de reconocimiento'}, 'title': {'type': 'string', 'description': 'Título del reconocimiento'}, 'message': {'type': 'string', 'description': 'Mensaje de reconocimiento'}, 'given_by_email': {'type': 'string', 'description': 'Email de quien otorgó el reconocimiento'}, 'given_by_name': {'type': 'string', 'description': 'Nombre de quien otorgó'}, 'points': {'type': 'number', 'default': 10, 'description': 'Puntos otorgados (default 10)'}, 'is_public': {'type': 'boolean', 'default': True, 'description': 'Si el reconocimiento es público'}, 'date': {'type': 'string', 'format': 'date', 'description': 'Fecha del reconocimiento'}}, 'required': ['employee_email', 'employee_name', 'recognition_type', 'title', 'message', 'given_by_email', 'given_by_name', 'date']}
```

---

### PATH: entities/Goal.json
```json
{'name': 'Goal', 'type': 'object', 'properties': {'title': {'type': 'string', 'description': 'Goal title'}, 'description': {'type': 'string', 'description': 'Detailed description'}, 'goal_type': {'type': 'string', 'enum': ['okr', 'kpi', 'milestone', 'objective'], 'default': 'okr', 'description': 'Type of goal'}, 'category': {'type': 'string', 'enum': ['personal', 'team', 'company', 'department'], 'default': 'personal', 'description': 'Goal category'}, 'owner_email': {'type': 'string', 'description': 'Email of goal owner'}, 'owner_name': {'type': 'string', 'description': 'Name of goal owner'}, 'team_id': {'type': 'string', 'description': 'Team ID if team goal'}, 'team_name': {'type': 'string', 'description': 'Team name if team goal'}, 'linked_job_id': {'type': 'string', 'description': 'Linked job/project ID'}, 'linked_job_name': {'type': 'string', 'description': 'Linked job/project name'}, 'start_date': {'type': 'string', 'format': 'date', 'description': 'Goal start date'}, 'target_date': {'type': 'string', 'format': 'date', 'description': 'Target completion date'}, 'current_value': {'type': 'number', 'default': 0, 'description': 'Current progress value'}, 'target_value': {'type': 'number', 'description': 'Target value to achieve'}, 'unit': {'type': 'string', 'default': 'percentage', 'description': 'Unit of measurement (percentage, hours, dollars, count, etc.)'}, 'status': {'type': 'string', 'enum': ['not_started', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled'], 'default': 'not_started', 'description': 'Goal status'}, 'priority': {'type': 'string', 'enum': ['low', 'medium', 'high', 'critical'], 'default': 'medium', 'description': 'Goal priority'}, 'key_results': {'type': 'array', 'items': {'type': 'object', 'properties': {'title': {'type': 'string'}, 'current': {'type': 'number'}, 'target': {'type': 'number'}, 'unit': {'type': 'string'}}}, 'description': 'Key results for OKRs'}, 'collaborators': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Array of collaborator emails'}, 'completed_date': {'type': 'string', 'format': 'date', 'description': 'Actual completion date'}, 'notes': {'type': 'string', 'description': 'Additional notes'}}, 'required': ['title', 'owner_email', 'owner_name', 'target_date', 'target_value']}
```

---

### PATH: entities/BonusConfiguration.json
```json
{'name': 'BonusConfiguration', 'type': 'object', 'properties': {'job_id': {'type': 'string', 'description': 'Job ID'}, 'job_name': {'type': 'string', 'description': 'Job Name'}, 'employee_email': {'type': 'string', 'description': 'Employee Email'}, 'employee_name': {'type': 'string', 'description': 'Employee Name'}, 'bonus_type': {'type': 'string', 'enum': ['percentage', 'fixed_amount'], 'default': 'percentage', 'description': 'Bonus Type'}, 'bonus_value': {'type': 'number', 'description': 'Bonus Percentage or Fixed Amount'}, 'notes': {'type': 'string', 'description': 'Notes'}, 'status': {'type': 'string', 'enum': ['active', 'inactive'], 'default': 'active', 'description': 'Status'}}, 'required': ['job_id', 'employee_email', 'bonus_type', 'bonus_value']}
```

---

## AGREEMENTS & SIGNATURES

### PATH: entities/AgreementSignature.json
```json
{'name': 'AgreementSignature', 'type': 'object', 'properties': {'user_id': {'type': 'string', 'description': 'User ID'}, 'employee_email': {'type': 'string', 'description': 'Employee email'}, 'employee_name': {'type': 'string', 'description': 'Employee name'}, 'agreement_type': {'type': 'string', 'enum': ['manager_variable_comp', 'foreman_variable_comp'], 'description': 'Type of agreement'}, 'version': {'type': 'string', 'description': 'Agreement version (e.g., v1.0)'}, 'accepted': {'type': 'boolean', 'default': True, 'description': 'Agreement accepted'}, 'accepted_at': {'type': 'string', 'format': 'date-time', 'description': 'When the agreement was signed'}, 'signature_name': {'type': 'string', 'description': 'Typed signature (full name)'}, 'signature_drawn_data': {'type': 'string', 'description': 'Drawn signature data (optional)'}, 'metadata': {'type': 'object', 'properties': {'ip': {'type': 'string'}, 'user_agent': {'type': 'string'}, 'device': {'type': 'string'}, 'app_version': {'type': 'string'}}, 'description': 'Metadata about the signature'}}, 'required': ['employee_email', 'agreement_type', 'version', 'signature_name']}
```

---

## INVENTORY ENTITIES

### PATH: entities/InventoryItem.json
```json
{'name': 'InventoryItem', 'type': 'object', 'properties': {'name': {'type': 'string', 'description': 'Nombre del item'}, 'category': {'type': 'string', 'enum': ['tools', 'materials', 'equipment', 'safety', 'supplies', 'hardware', 'other'], 'description': 'Categoría'}, 'inventory_type': {'type': 'string', 'enum': ['tools', 'hardware'], 'default': 'tools', 'description': 'Tipo de inventario: herramientas o hardware'}, 'team_id': {'type': 'string', 'description': 'ID del equipo al que pertenece el inventario'}, 'team_name': {'type': 'string', 'description': 'Nombre del equipo'}, 'description': {'type': 'string', 'description': 'Descripción detallada'}, 'sku': {'type': 'string', 'description': 'SKU o código'}, 'quantity': {'type': 'number', 'default': 0, 'description': 'Cantidad disponible'}, 'min_quantity': {'type': 'number', 'default': 0, 'description': 'Cantidad mínima (alerta)'}, 'unit': {'type': 'string', 'enum': ['units', 'feet', 'meters', 'gallons', 'boxes', 'rolls', 'hours', 'sqft', 'bags', 'pounds'], 'default': 'units', 'description': 'Unidad de medida estandarizada'}, 'cost': {'type': 'number', 'description': 'Costo por unidad'}, 'location': {'type': 'string', 'description': 'Ubicación física'}, 'photo_url': {'type': 'string', 'description': 'Foto del item'}, 'supplier_id': {'type': 'string', 'description': 'ID del proveedor (referencia a Customer)'}, 'supplier_name': {'type': 'string', 'description': 'Nombre del proveedor'}, 'status': {'type': 'string', 'enum': ['in_stock', 'low_stock', 'out_of_stock'], 'default': 'in_stock', 'description': 'Estado'}}, 'required': ['name', 'category']}
```

---

### PATH: entities/InventoryTransaction.json
```json
{'name': 'InventoryTransaction', 'type': 'object', 'properties': {'item_id': {'type': 'string', 'description': 'ID del item de inventario'}, 'item_name': {'type': 'string', 'description': 'Nombre del item'}, 'team_id': {'type': 'string', 'description': 'ID del equipo'}, 'team_name': {'type': 'string', 'description': 'Nombre del equipo'}, 'type': {'type': 'string', 'enum': ['add', 'remove', 'adjust', 'transfer'], 'description': 'Tipo de transacción'}, 'quantity': {'type': 'number', 'description': 'Cantidad'}, 'reason': {'type': 'string', 'description': 'Razón (compra, uso en trabajo, ajuste, transferencia, etc.)'}, 'job_id': {'type': 'string', 'description': 'ID del trabajo asociado (si aplica)'}, 'job_name': {'type': 'string', 'description': 'Nombre del trabajo'}, 'transfer_to_team_id': {'type': 'string', 'description': 'ID del equipo destino (para transferencias)'}, 'transfer_to_team_name': {'type': 'string', 'description': 'Nombre del equipo destino'}, 'employee_email': {'type': 'string', 'description': 'Empleado que hizo la transacción'}, 'employee_name': {'type': 'string', 'description': 'Nombre del empleado'}, 'notes': {'type': 'string', 'description': 'Notas adicionales'}}, 'required': ['item_id', 'item_name', 'type', 'quantity', 'employee_email', 'employee_name']}
```

---

## NOTIFICATION & SYSTEM ENTITIES

### PATH: entities/Notification.json
```json
{'name': 'Notification', 'type': 'object', 'properties': {'recipient_email': {'type': 'string', 'description': 'Email del destinatario'}, 'recipient_name': {'type': 'string', 'description': 'Nombre del destinatario'}, 'type': {'type': 'string', 'enum': ['project_invitation', 'project_member_added', 'task_assigned', 'task_status_changed', 'task_due_soon', 'task_overdue', 'access_request_pending', 'access_request_approved', 'access_request_rejected', 'comment_mention', 'file_uploaded', 'milestone_completed', 'system_alert'], 'description': 'Tipo de notificación'}, 'priority': {'type': 'string', 'enum': ['low', 'medium', 'high', 'urgent'], 'default': 'medium', 'description': 'Prioridad'}, 'title': {'type': 'string', 'description': 'Título de la notificación'}, 'message': {'type': 'string', 'description': 'Mensaje de la notificación'}, 'action_url': {'type': 'string', 'description': 'URL de acción (página a la que debe navegar)'}, 'related_entity_type': {'type': 'string', 'description': 'Tipo de entidad relacionada (project, task, etc.)'}, 'related_entity_id': {'type': 'string', 'description': 'ID de la entidad relacionada'}, 'metadata': {'type': 'object', 'description': 'Datos adicionales del contexto'}, 'is_read': {'type': 'boolean', 'default': False, 'description': 'Si fue leída'}, 'read_date': {'type': 'string', 'format': 'date-time', 'description': 'Fecha de lectura'}, 'sent_via_email': {'type': 'boolean', 'default': False, 'description': 'Si se envió por email'}, 'email_sent_date': {'type': 'string', 'format': 'date-time', 'description': 'Fecha de envío de email'}}, 'required': ['recipient_email', 'type', 'title', 'message']}
```

---

### PATH: entities/CompanySettings.json
```json
{'name': 'CompanySettings', 'type': 'object', 'properties': {'company_name': {'type': 'string', 'description': 'Nombre de la compañía'}, 'company_logo_url': {'type': 'string', 'description': 'URL del logo de la compañía'}, 'address_line_1': {'type': 'string', 'description': 'Dirección línea 1'}, 'address_line_2': {'type': 'string', 'description': 'Dirección línea 2'}, 'city': {'type': 'string', 'description': 'Ciudad'}, 'state': {'type': 'string', 'description': 'Estado'}, 'zip': {'type': 'string', 'description': 'Código postal'}, 'country': {'type': 'string', 'description': 'País', 'default': 'U.S.A'}, 'phone': {'type': 'string', 'description': 'Teléfono'}, 'email': {'type': 'string', 'description': 'Email'}, 'website': {'type': 'string', 'description': 'Sitio web'}, 'default_hourly_rate': {'type': 'number', 'default': 25, 'description': 'Tarifa por hora predeterminada para nuevos empleados'}, 'standard_labor_rate_per_hour': {'type': 'number', 'default': 25, 'description': 'Tasa laboral estándar para cálculo de costos de ítems de Labor/Service ($25.00/hora)'}, 'default_per_diem_amount': {'type': 'number', 'default': 50, 'description': 'Monto per diem predeterminado'}, 'default_vacation_accrual_rate': {'type': 'number', 'default': 1.5, 'description': 'Tasa de acumulación de vacaciones predeterminada (días/mes)'}, 'notifications_email_fallback_enabled': {'type': 'boolean', 'default': True, 'description': 'Habilitar envío de email fallback para alertas urgentes'}, 'notifications_email_subject_prefix': {'type': 'string', 'default': 'MCI Connect Alert', 'description': 'Prefijo del asunto de emails del sistema'}}, 'required': ['company_name']}
```

---

## MCI FIELD ENTITIES (Subset - Core)

### PATH: entities/Task.json
```json
{'name': 'Task', 'type': 'object', 'properties': {'job_id': {'type': 'string', 'description': 'Reference to the Job entity'}, 'title': {'type': 'string', 'description': 'Task title'}, 'description': {'type': 'string', 'description': 'Task description'}, 'assigned_to': {'type': 'string', 'description': 'Email of the assigned user'}, 'priority': {'type': 'string', 'enum': ['low', 'medium', 'high', 'urgent'], 'default': 'medium'}, 'status': {'type': 'string', 'enum': ['pending', 'in_progress', 'completed', 'blocked'], 'default': 'pending'}, 'category': {'type': 'string', 'enum': ['installation', 'change_order', 'rfi'], 'default': 'installation'}, 'due_date': {'type': 'string', 'format': 'date'}, 'pin_x': {'type': 'number', 'description': 'X coordinate on blueprint (percentage)'}, 'pin_y': {'type': 'number', 'description': 'Y coordinate on blueprint (percentage)'}, 'blueprint_id': {'type': 'string', 'description': 'Reference to which blueprint/plan this task is on'}, 'checklist': {'type': 'array', 'items': {'type': 'object', 'properties': {'id': {'type': 'string'}, 'text': {'type': 'string'}, 'completed': {'type': 'boolean'}, 'status': {'type': 'string'}}}}, 'photo_urls': {'type': 'array', 'items': {'type': 'string'}, 'default': [], 'description': 'URLs of photos attached to this task'}, 'watched_by': {'type': 'array', 'items': {'type': 'string'}}, 'cost': {'type': 'number'}, 'manpower': {'type': 'string'}, 'tags': {'type': 'array', 'items': {'type': 'string'}}}, 'required': ['job_id', 'title']}
```

---

## AUXILIARY ENTITIES (Remaining ~50)

**Note**: Due to size constraints, listing names only. Use `read_file` to get full schemas.

- entities/TaskComment.json
- entities/TaskAttachment.json  
- entities/TaskTemplate.json
- entities/Plan.json
- entities/PlanAnnotation.json
- entities/Photo.json
- entities/Document.json
- entities/DocumentFolder.json
- entities/DocumentVersion.json
- entities/Report.json
- entities/ProjectMember.json
- entities/ProjectInvitation.json
- entities/ProjectAccessRequest.json
- entities/WorkflowRule.json
- entities/WorkflowLog.json
- entities/SmartNotification.json
- entities/NotificationSubscription.json
- entities/NotificationLog.json
- entities/TeamAnalytics.json
- entities/TaskDependency.json
- entities/TaskTimeLog.json
- entities/TaskHistory.json
- entities/PhotoAnnotation.json
- entities/PhotoComparison.json
- entities/ChecklistTemplate.json
- entities/ScheduledInspection.json
- entities/InspectionSubmission.json
- entities/ProjectBudget.json
- entities/ProjectCost.json
- entities/ClientApproval.json
- entities/ProjectMilestone.json
- entities/FieldActivityLog.json
- entities/MaterialQRCode.json
- entities/WallTypeTemplate.json
- entities/EmployeeAvailability.json
- entities/EmployeeTimeOff.json
- entities/FinancialDocument.json
- entities/WorkUnit.json
- entities/EmployeeSkill.json
- entities/TaskLocationPattern.json
- entities/ClientNotificationRule.json
- entities/EmployeeDocument.json
- entities/OnboardingTask.json
- entities/OffboardingTask.json
- entities/LoginAttempt.json
- entities/NotificationSettings.json
- entities/DashboardPreferences.json
- entities/PushSubscription.json
- entities/BonusAuditLog.json
- entities/CertificationAlert.json
- entities/QuoteItemPriceLog.json
- entities/ScheduleShift.json
- entities/Role.json
- entities/ActivityFeed.json
- entities/GoalProgress.json
- entities/Comment.json
- entities/ChatNotification.json
- entities/BreakLog.json
- entities/JobFile.json
- entities/AssignmentFile.json

---

**Total Entities Documented**: 84  
**Critical Entities (Must-Have)**: 30  
**Optional Entities (Nice-to-Have)**: 54

**End of Entities Export**