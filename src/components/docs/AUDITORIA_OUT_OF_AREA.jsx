# 🌍 AUDITORÍA COMPLETA: OUT OF AREA CONFIGURATION

**Fecha:** 17 de febrero de 2026  
**Sistema:** MCI Connect - Quote/Estimados Module  
**Subsistema:** Out of Area Calculator (Unified)

---

## 📋 TABLA DE CONTENIDO

1. [Concepto y Propósito](#concepto)
2. [Arquitectura del Sistema](#arquitectura)
3. [Flujo Completo Paso a Paso](#flujo)
4. [Cálculos Matemáticos Detallados](#calculos)
5. [Ejemplo Práctico Completo](#ejemplo)
6. [Configuraciones y Parámetros](#configuraciones)
7. [Items Generados Automáticamente](#items)
8. [Validaciones y Reglas de Negocio](#validaciones)
9. [Interacción con Otros Módulos](#integracion)
10. [Casos Edge y Consideraciones](#edge-cases)

---

## 🎯 CONCEPTO Y PROPÓSITO {#concepto}

### ¿Qué es "Out of Area"?

**Out of Area** se refiere a trabajos que están **fuera del área de servicio normal** de MCI, requiriendo que el equipo:

1. **Viaje** desde su ubicación base hasta el sitio del trabajo
2. **Se hospede en hotel** durante la duración del proyecto
3. **Reciba per diem** para gastos de comida y viáticos

### Propósito del Sistema

El **Out of Area Calculator** automatiza completamente el cálculo de todos los costos asociados con trabajos remotos:

- ✅ **Distancias de manejo** (usando Google Maps API)
- ✅ **Tiempo de conducción** (con 10% buffer)
- ✅ **Duración del proyecto** (basada en horas de instalación)
- ✅ **Noches de hotel** (incluye weekends y días de viaje)
- ✅ **Per diem** (incluye todos los días calendario)
- ✅ **Múltiples equipos** (si varios teams viajan)
- ✅ **Múltiples viajes** (round trips configurables)

### ¿Por qué es crítico?

**Sin automatización:**
- ❌ Errores humanos al calcular noches (olvidar weekends)
- ❌ Inconsistencias entre duración del proyecto y costos de hospedaje
- ❌ Subestimación de per diem (olvidar días de viaje)
- ❌ Cálculos manuales propensos a errores

**Con automatización:**
- ✅ **100% consistente** con la duración real del proyecto
- ✅ **Auto-sincronizado** cuando cambian items o horas
- ✅ **Zero errores** de cálculo manual
- ✅ **Transparente** - todos los cálculos son visibles

---

## 🏗️ ARQUITECTURA DEL SISTEMA {#arquitectura}

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    CrearEstimado.jsx                        │
│                    (Quote Root - CAPA 1)                    │
│                                                             │
│  • Mantiene formData (items, techs, etc.)                  │
│  • Ejecuta useMemo para derivedValues                      │
│  • Pasa derivedValues a componentes hijos                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│          UnifiedOutOfAreaCalculator.jsx                     │
│          (CAPA 4 - UI Component)                            │
│                                                             │
│  • Recibe: jobAddress, selectedTeamIds, derivedValues      │
│  • Inputs: techCount, roundTrips, roomsPerNight            │
│  • Llama: calculateTravelMetrics (backend)                 │
│  • Genera: travelItems + stayItems                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    ▼                             ▼
┌─────────────────────┐   ┌─────────────────────────┐
│ calculateTravelMetrics│   │ computeQuoteDerived    │
│ (Backend Function)    │   │ (Pure Function - CAPA 2)│
│                       │   │                         │
│ • Google Maps API     │   │ • Calcula work days     │
│ • Distancias reales   │   │ • Convierte a calendar  │
│ • Tiempo de manejo    │   │ • Suma travel days      │
│ • 10% buffer          │   │ • Calcula nights        │
└───────────────────────┘   │ • Hotel rooms           │
                            │ • Per diem              │
                            └─────────────────────────┘
```

### Flujo de Datos

```
User Input → Calculate Distances → Derive Duration → Generate Items → Add to Quote
     ↓              ↓                    ↓                  ↓              ↓
   Teams,      Google Maps         computeQuote       Travel Items   formData.items
  Address         API                Derived          + Stay Items     updated
```

---

## 🔄 FLUJO COMPLETO PASO A PASO {#flujo}

### PASO 1: Usuario Inicia Configuración

**Ubicación:** `UnifiedOutOfAreaCalculator.jsx`

**Inputs requeridos:**
1. ✅ **Job Address** - Dirección del trabajo (ej: "123 Main St, Los Angeles, CA")
2. ✅ **Selected Teams** - Al menos 1 equipo seleccionado (ej: "Team LA")
3. ✅ **Tech Count** - Número de técnicos (default: 2)
4. ✅ **Rooms per Night** - Cuartos por noche (default: ceil(techs / 2) = 1)
5. ✅ **Round Trips** - Número de viajes redondos (default: 1)
6. ✅ **Days per Trip** - Días por viaje (default: 2)
7. ✅ **Nights per Trip** - Noches por viaje (default: 2)

**Validación:**
```javascript
if (!jobAddress || selectedTeamIds.length === 0) {
  setError('Enter job address and select at least one team');
  return;
}
```

---

### PASO 2: Calcular Distancias (Backend)

**Función:** `calculateTravelMetrics` (backend function)

**Proceso:**

1. **Fetch Teams from DB:**
   ```javascript
   const teams = await base44.asServiceRole.entities.Team.list();
   const selectedTeams = teams.filter(t => teamIds.includes(t.id));
   ```

2. **Por cada team:**
   
   a) **Verificar base_address:**
   ```javascript
   if (!team.base_address) {
     results.push({ teamId, teamName, error: 'Missing base_address', success: false });
     continue;
   }
   ```
   
   b) **Llamar Google Maps Distance Matrix API:**
   ```javascript
   const url = `https://maps.googleapis.com/maps/api/distancematrix/json
     ?origins=${encodeURIComponent(team.base_address)}
     &destinations=${encodeURIComponent(jobAddress)}
     &key=${apiKey}`;
   
   const response = await fetch(url);
   const data = await response.json();
   ```
   
   c) **Extraer distancia y tiempo:**
   ```javascript
   const distanceMeters = element.distance.value;  // Metros
   const durationSeconds = element.duration.value; // Segundos
   ```
   
   d) **Convertir y aplicar buffer (+10%):**
   ```javascript
   // Distancia
   const oneWayMiles = distanceMeters * 0.000621371;    // A millas
   const roundTripMiles = oneWayMiles * 2;              // Ida y vuelta
   const totalMilesWithBuffer = roundTripMiles * 1.1;   // +10% buffer
   
   // Tiempo
   const oneWayHours = durationSeconds / 3600;          // A horas
   const roundTripHours = oneWayHours * 2;              // Ida y vuelta
   const hoursWithBuffer = roundTripHours * 1.1;        // +10% buffer
   const roundedHours = Math.ceil(hoursWithBuffer * 2) / 2; // Redondear a 0.5h
   ```

3. **Retornar resultados:**
   ```javascript
   return {
     teamId: team.id,
     teamName: team.team_name,
     teamLocation: team.location,
     baseAddress: team.base_address,
     oneWayMiles: "45.3",      // string
     roundTripMiles: "90.6",   // string
     totalMiles: "99.7",       // string (con 10% buffer)
     oneWayHours: "0.75",      // string
     roundTripHours: "1.50",   // string
     drivingHours: "1.5",      // string (redondeado a 0.5h)
     success: true
   }
   ```

**Ejemplo de respuesta múltiple:**
```json
{
  "results": [
    {
      "teamId": "team_001",
      "teamName": "Team LA",
      "totalMiles": "99.7",
      "drivingHours": "1.5",
      "success": true
    },
    {
      "teamId": "team_002",
      "teamName": "Team SD",
      "totalMiles": "165.0",
      "drivingHours": "3.0",
      "success": true
    }
  ]
}
```

---

### PASO 3: Usuario Ajusta Configuración

**En UI - `UnifiedOutOfAreaCalculator.jsx`:**

Usuario puede modificar:

1. **Número de vehículos por equipo** (default: 1)
   - Incrementar/decrementar con botones +/-
   - Afecta: Total millas = milesPerVehicle × vehicleCount × roundTrips

2. **Round Trips** (default: 1)
   - Número de viajes redondos
   - Afecta: Driving hours, mileage, días calendario adicionales

3. **Days per Trip** (default: 2)
   - Días por viaje adicional
   - Afecta: totalCalendarDays += (roundTrips - 1) × daysPerTrip

4. **Nights per Trip** (default: 2)
   - Noches por viaje adicional
   - Afecta: nights calculation

---

### PASO 4: Calcular Duración del Proyecto (Automático)

**Función:** `computeQuoteDerived()` - SINGLE SOURCE OF TRUTH

**Input (canonical):**
```javascript
const input = createComputeInput({
  items: nonTravelItems,           // Solo items de instalación
  techs: 2,                         // Número de técnicos
  travelEnabled: true,              // Si tiempo de viaje > 4h
  travelHours: 1.5,                 // Tiempo de viaje one-way
  hoursPerDay: 8,                   // Horas por día laboral
  roomsPerNight: 1,                 // Cuartos por noche
  roundTrips: 1,                    // Viajes redondos
  nightsPerTrip: 2,                 // Noches por viaje
  daysPerTrip: 2                    // Días por viaje
});

const derived = computeQuoteDerived(input);
```

**Proceso interno (ver sección de cálculos detallados):**

1. Suma horas de instalación
2. Calcula días laborales
3. Convierte a días calendario (incluye weekends)
4. Agrega días de viaje (si aplica)
5. Calcula noches totales
6. Calcula hotel rooms
7. Calcula per diem

**Output:**
```javascript
{
  totalLaborHours: 80,      // De items
  workDays: 5,              // Lun-Vie
  calendarDays: 7,          // Incluye Sáb-Dom
  travelDays: 0,            // Solo si >4h one-way
  totalCalendarDays: 7,     // Total con viaje
  nights: 6,                // Noches de hotel
  hotelRooms: 6,            // 1 room × 6 nights
  perDiemDays: 14,          // 2 techs × 7 days
  breakdown: { ... }        // Desglose paso a paso
}
```

---

### PASO 5: Generar Items para Quote

**Función:** `addAllToQuote()` en `UnifiedOutOfAreaCalculator.jsx`

**Items generados:**

#### A) TRAVEL ITEMS (por cada equipo)

**1. Driving Time:**
```javascript
{
  item_name: "Driving Time - Team LA",
  description: "1 round trip from 123 Main St to job site (99.7 mi each)",
  quantity: 1.5,                    // drivingHours × roundTrips
  unit: "hours",
  unit_price: 60,                   // De CompanySettings o default
  total: 90,                        // 1.5h × $60
  is_travel_item: true,
  travel_item_type: "driving_time",
  team_id: "team_001",
  round_trips: 1,
  account_category: "expense_travel_per_diem"
}
```

**2. Miles per Vehicle:**
```javascript
{
  item_name: "Miles per Vehicle - Team LA",
  description: "1 vehicle × 99.7 miles × 1 trip",
  quantity: 99.7,                   // totalMiles × vehicleCount × roundTrips
  unit: "miles",
  unit_price: 0.70,                 // De CompanySettings o default
  total: 69.79,                     // 99.7mi × $0.70
  is_travel_item: true,
  travel_item_type: "miles_per_vehicle",
  team_id: "team_001",
  vehicle_count: 1,
  round_trips: 1,
  account_category: "expense_travel_per_diem"
}
```

#### B) STAY ITEMS (basados en derivedValues)

**3. Hotel Rooms:**
```javascript
{
  item_name: "Hotel Rooms",
  description: "1 room × 6 nights",
  quantity: 6,                      // roomsPerNight × derivedValues.nights
  unit: "night",
  unit_price: 200,                  // De QuoteItem catalog o default
  total: 1200,                      // 6 nights × $200
  is_travel_item: false,            // NO es travel item
  travel_item_type: "hotel",
  account_category: "expense_travel_per_diem",
  round_trips: 1,                   // No multiplicar - ya incluido en quantity
  nights_per_trip: 2,
  rooms_per_night: 1
}
```

**4. Per-Diem:**
```javascript
{
  item_name: "Per-Diem",
  description: "2 techs × 7 days",
  quantity: 14,                     // techCount × derivedValues.totalCalendarDays
  unit: "day",
  unit_price: 55,                   // De QuoteItem catalog o default
  total: 770,                       // 14 days × $55
  is_travel_item: false,            // NO es travel item
  travel_item_type: "per_diem",
  account_category: "expense_travel_per_diem",
  round_trips: 1,                   // No multiplicar - ya incluido en quantity
  days_per_trip: 2,
  tech_count: 2
}
```

---

## 🧮 CÁLCULOS MATEMÁTICOS DETALLADOS {#calculos}

### CÁLCULO 1: Total Labor Hours

**Fórmula:**
```
totalLaborHours = Σ(installation_time × quantity)
```

**Reglas:**
- Solo cuenta items CON `installation_time > 0`
- Excluye items con `is_travel_item: true`
- Suma todos los items de instalación

**Ejemplo:**
```javascript
items = [
  { item_name: "Panel Installation", installation_time: 2, quantity: 20 },  // 40h
  { item_name: "Wiring", installation_time: 1.5, quantity: 15 },           // 22.5h
  { item_name: "Testing", installation_time: 0.5, quantity: 35 },          // 17.5h
  { item_name: "Hotel Rooms", is_travel_item: true }                       // Skip
]

totalLaborHours = (2 × 20) + (1.5 × 15) + (0.5 × 35) = 40 + 22.5 + 17.5 = 80h
```

---

### CÁLCULO 2: Work Days (Días Laborales)

**Fórmula:**
```
rawWorkDays = totalLaborHours / (hoursPerDay × techCount)
workDays = Math.ceil(rawWorkDays)
```

**Reglas:**
- `hoursPerDay` = 8 horas por día laboral (fijo)
- **SIEMPRE redondear HACIA ARRIBA** (3 horas = 1 día completo)
- Solo cuenta Lunes-Viernes

**Ejemplo:**
```javascript
totalLaborHours = 80h
techCount = 2
hoursPerDay = 8

rawWorkDays = 80 / (8 × 2) = 80 / 16 = 5.0 días
workDays = Math.ceil(5.0) = 5 días laborales
```

**Ejemplo con redondeo:**
```javascript
totalLaborHours = 75h
techCount = 2
hoursPerDay = 8

rawWorkDays = 75 / 16 = 4.6875 días
workDays = Math.ceil(4.6875) = 5 días laborales ✅ (siempre cobra día completo)
```

---

### CÁLCULO 3: Calendar Days (Días Calendario)

**Fórmula:**
```
fullWeeks = floor(workDays / 5)
remainingDays = workDays % 5
calendarDays = (fullWeeks × 7) + remainingDays + (remainingDays > 4 ? 2 : 0)
```

**Reglas:**
- **Asume inicio el Lunes**
- Cada semana completa = 5 días laborales + 2 días weekend = 7 días calendario
- Si sobran días que cruzan el viernes, agrega 2 días de weekend

**Ejemplo 1: 5 días laborales exactos (1 semana)**
```javascript
workDays = 5

fullWeeks = floor(5 / 5) = 1 semana completa
remainingDays = 5 % 5 = 0 días sobrantes
calendarDays = (1 × 7) + 0 + 0 = 7 días calendario

Desglose:
Lun, Mar, Mié, Jue, Vie = 5 días laborales
Sáb, Dom = 2 días weekend
Total = 7 días calendario
```

**Ejemplo 2: 8 días laborales (1 semana + 3 días)**
```javascript
workDays = 8

fullWeeks = floor(8 / 5) = 1 semana completa
remainingDays = 8 % 5 = 3 días sobrantes
calendarDays = (1 × 7) + 3 + 0 = 10 días calendario

Desglose:
Semana 1: Lun-Vie = 5 días + Sáb-Dom = 2 días
Semana 2: Lun-Mié = 3 días
Total = 10 días calendario
```

**Ejemplo 3: 3 días laborales (< 1 semana)**
```javascript
workDays = 3

fullWeeks = floor(3 / 5) = 0 semanas completas
remainingDays = 3 % 5 = 3 días sobrantes
calendarDays = (0 × 7) + 3 + 0 = 3 días calendario

Desglose:
Lun, Mar, Mié = 3 días (no cruza viernes, no agrega weekend)
Total = 3 días calendario
```

---

### CÁLCULO 4: Travel Days (Días de Viaje)

**Fórmula:**
```
travelDays = (travelEnabled && travelHours > 4) ? 2 : 0
```

**Reglas:**
- Si **one-way travel > 4 horas**: Agregar 2 días de viaje
- **Día 1:** Viaje de ida (domingo antes del trabajo)
- **Día 2:** Viaje de regreso (después del último día de trabajo)

**¿Por qué 4 horas?**
- Travel ≤ 4h: Se puede hacer en el mismo día (salir temprano)
- Travel > 4h: Requiere viaje dedicado (no se puede trabajar ese día)

**Ejemplo:**
```javascript
travelHours = 5.5  // One-way
travelEnabled = true

travelDays = 2

// Sin viajes de día completo:
// Domingo: Viaje 5.5h → Llegar tarde → Pernoctar
// Lunes: Empezar trabajo
// ...
// Viernes: Terminar trabajo
// Sábado: Viaje de regreso 5.5h

// Calendario:
// Dom (viaje) + Lun-Vie (trabajo) + Sáb (viaje) = 7 días
```

---

### CÁLCULO 5: Total Calendar Days

**Fórmula:**
```
baseTotal = calendarDays + travelDays
additionalDays = (roundTrips - 1) × daysPerTrip
totalCalendarDays = baseTotal + additionalDays
```

**Ejemplo 1: 1 Round Trip**
```javascript
calendarDays = 7    // Del cálculo anterior
travelDays = 0      // Travel ≤ 4h
roundTrips = 1

baseTotal = 7 + 0 = 7
additionalDays = (1 - 1) × 2 = 0
totalCalendarDays = 7 + 0 = 7 días
```

**Ejemplo 2: 3 Round Trips**
```javascript
calendarDays = 7    // Del cálculo anterior
travelDays = 0      
roundTrips = 3      // ¡3 viajes!
daysPerTrip = 2     // 2 días por viaje adicional

baseTotal = 7 + 0 = 7
additionalDays = (3 - 1) × 2 = 4 días
totalCalendarDays = 7 + 4 = 11 días

// Desglose:
// Trip 1: 7 días (base project)
// Trip 2: +2 días
// Trip 3: +2 días
// Total: 11 días
```

---

### CÁLCULO 6: Nights (Noches de Hotel)

**Fórmula:**
```
nights = Math.max(Math.ceil(totalCalendarDays - 1), 0)
```

**Reglas:**
- Noches = Días totales - 1 (check out en el último día)
- **SIEMPRE redondear HACIA ARRIBA**
- **NUNCA negativo**

**Ejemplo 1:**
```javascript
totalCalendarDays = 7

nights = Math.max(Math.ceil(7 - 1), 0)
nights = Math.max(Math.ceil(6), 0)
nights = Math.max(6, 0)
nights = 6 noches ✅
```

**Ejemplo 2: Con redondeo**
```javascript
totalCalendarDays = 3.2  // Teóricamente

nights = Math.max(Math.ceil(3.2 - 1), 0)
nights = Math.max(Math.ceil(2.2), 0)
nights = Math.max(3, 0)
nights = 3 noches ✅ (redondea arriba)
```

**Ejemplo 3: Edge case**
```javascript
totalCalendarDays = 0

nights = Math.max(Math.ceil(0 - 1), 0)
nights = Math.max(Math.ceil(-1), 0)
nights = Math.max(-1, 0)
nights = 0 ✅ (nunca negativo)
```

---

### CÁLCULO 7: Hotel Rooms (Room-Nights)

**Fórmula:**
```
defaultRoomsPerNight = Math.ceil(techCount / 2)
effectiveRoomsPerNight = roomsPerNight || defaultRoomsPerNight
hotelRooms = effectiveRoomsPerNight × nights
```

**Reglas:**
- Default: **2 técnicos por cuarto**
- Usuario puede override `roomsPerNight` manualmente
- Total rooms = cuartos por noche × noches totales

**Ejemplo 1: 2 técnicos (default)**
```javascript
techCount = 2
nights = 6
roomsPerNight = null  // Usuario no especificó

defaultRoomsPerNight = Math.ceil(2 / 2) = 1 cuarto
effectiveRoomsPerNight = 1
hotelRooms = 1 × 6 = 6 room-nights
```

**Ejemplo 2: 5 técnicos (3 cuartos)**
```javascript
techCount = 5
nights = 6
roomsPerNight = null

defaultRoomsPerNight = Math.ceil(5 / 2) = 3 cuartos
effectiveRoomsPerNight = 3
hotelRooms = 3 × 6 = 18 room-nights
```

**Ejemplo 3: Override manual**
```javascript
techCount = 5
nights = 6
roomsPerNight = 5  // Usuario quiere cuartos individuales

effectiveRoomsPerNight = 5  // Usa override
hotelRooms = 5 × 6 = 30 room-nights
```

---

### CÁLCULO 8: Per Diem (Días-Persona)

**Fórmula:**
```
perDiemDays = techCount × totalCalendarDays
```

**Reglas:**
- 1 per diem por técnico por día calendario
- Incluye weekends, días de viaje, y días adicionales por múltiples trips

**Ejemplo 1: Básico**
```javascript
techCount = 2
totalCalendarDays = 7

perDiemDays = 2 × 7 = 14 person-days
```

**Ejemplo 2: Con múltiples trips**
```javascript
techCount = 2
totalCalendarDays = 11  // Base 7 + 4 días adicionales (2 trips extra)

perDiemDays = 2 × 11 = 22 person-days
```

**Ejemplo 3: Con más técnicos**
```javascript
techCount = 5
totalCalendarDays = 7

perDiemDays = 5 × 7 = 35 person-days
```

---

## 📊 EJEMPLO PRÁCTICO COMPLETO {#ejemplo}

### Escenario Real

**Proyecto:**
- Cliente: "ABC Corp"
- Trabajo: "Data Center Installation - Phoenix"
- Dirección: "123 E Washington St, Phoenix, AZ 85004"
- Items de instalación: 80 horas totales
- Equipos viajando: Team LA + Team SD
- Técnicos: 2 por equipo (total 4, pero trabajan juntos como 4 techs)

**Paso a paso:**

---

#### PASO 1: Usuario ingresa configuración

```javascript
jobAddress = "123 E Washington St, Phoenix, AZ 85004"
selectedTeamIds = ["team_LA", "team_SD"]
techCount = 4
roomsPerNight = 2  // 4 techs / 2 = 2 rooms
roundTrips = 1
daysPerTrip = 2
nightsPerTrip = 2
```

---

#### PASO 2: Calcular distancias (backend)

**Team LA:**
```
Base: "1234 Main St, Los Angeles, CA 90001"
Job:  "123 E Washington St, Phoenix, AZ 85004"

Google Maps response:
- Distance: 612,000 meters
- Duration: 21,600 seconds (6 hours)

Cálculos:
oneWayMiles = 612000 × 0.000621371 = 380.3 mi
roundTripMiles = 380.3 × 2 = 760.6 mi
totalMiles (+ 10%) = 760.6 × 1.1 = 836.7 mi

oneWayHours = 21600 / 3600 = 6.0h
roundTripHours = 6.0 × 2 = 12.0h
hoursWithBuffer = 12.0 × 1.1 = 13.2h
roundedHours = ceil(13.2 × 2) / 2 = ceil(26.4) / 2 = 27 / 2 = 13.5h
```

**Team SD:**
```
Base: "5678 Harbor Dr, San Diego, CA 92101"
Job:  "123 E Washington St, Phoenix, AZ 85004"

Google Maps response:
- Distance: 580,000 meters
- Duration: 19,800 seconds (5.5 hours)

Cálculos:
oneWayMiles = 360.4 mi
roundTripMiles = 720.8 mi
totalMiles (+ 10%) = 792.9 mi

oneWayHours = 5.5h
roundTripHours = 11.0h
hoursWithBuffer = 12.1h
roundedHours = 12.5h
```

---

#### PASO 3: Calcular duración del proyecto

**Input:**
```javascript
items = [
  { installation_time: 2, quantity: 20 },   // 40h
  { installation_time: 1.5, quantity: 15 }, // 22.5h
  { installation_time: 0.5, quantity: 35 }  // 17.5h
]
techCount = 4
travelHours = 6.0  // Max de los equipos (Team LA)
travelEnabled = true
hoursPerDay = 8
roomsPerNight = 2
roundTrips = 1
```

**Cálculo paso a paso:**

```javascript
// STEP 1: Labor hours
totalLaborHours = 40 + 22.5 + 17.5 = 80h

// STEP 2: Work days
rawWorkDays = 80 / (8 × 4) = 80 / 32 = 2.5 días
workDays = Math.ceil(2.5) = 3 días laborales

// STEP 3: Calendar days (sin travel)
fullWeeks = floor(3 / 5) = 0
remainingDays = 3 % 5 = 3
calendarDays = (0 × 7) + 3 + 0 = 3 días

// STEP 4: Travel days
travelHours = 6.0 > 4.0 ✅
travelDays = 2 días (domingo ida + sábado regreso)

// STEP 5: Total calendar days
baseTotal = 3 + 2 = 5 días
additionalDays = (1 - 1) × 2 = 0
totalCalendarDays = 5 + 0 = 5 días

// STEP 6: Nights
nights = Math.ceil(5 - 1) = Math.ceil(4) = 4 noches

// STEP 7: Hotel rooms
roomsPerNight = 2
hotelRooms = 2 × 4 = 8 room-nights

// STEP 8: Per diem
perDiemDays = 4 × 5 = 20 person-days
```

**Calendario completo:**
```
Domingo (día 1):  Viaje Team LA + SD → Phoenix (6h drive)
Lunes (día 2):    Trabajo día 1 (8h × 4 techs = 32h)
Martes (día 3):   Trabajo día 2 (8h × 4 techs = 32h)
Miércoles (día 4): Trabajo día 3 (8h × 4 techs = 16h) - Termina mediodía
Jueves (día 5):   Viaje de regreso (check out → drive home)

Total: 5 días calendario
Noches: 4 (Dom, Lun, Mar, Mié)
```

---

#### PASO 4: Generar items

**Travel Items (2 equipos):**

**Team LA - Driving Time:**
```javascript
{
  item_name: "Driving Time - Team LA",
  description: "1 round trip from LA to Phoenix (836.7 mi each)",
  quantity: 13.5,               // drivingHours × roundTrips
  unit: "hours",
  unit_price: 60,
  total: 810.00,                // 13.5h × $60
  is_travel_item: true,
  travel_item_type: "driving_time"
}
```

**Team LA - Mileage:**
```javascript
{
  item_name: "Miles per Vehicle - Team LA",
  description: "1 vehicle × 836.7 miles × 1 trip",
  quantity: 836.7,              // totalMiles × vehicles × trips
  unit: "miles",
  unit_price: 0.70,
  total: 585.69,                // 836.7mi × $0.70
  is_travel_item: true,
  travel_item_type: "miles_per_vehicle"
}
```

**Team SD - Driving Time:**
```javascript
{
  item_name: "Driving Time - Team SD",
  quantity: 12.5,
  total: 750.00                 // 12.5h × $60
}
```

**Team SD - Mileage:**
```javascript
{
  item_name: "Miles per Vehicle - Team SD",
  quantity: 792.9,
  total: 555.03                 // 792.9mi × $0.70
}
```

**Stay Items:**

**Hotel Rooms:**
```javascript
{
  item_name: "Hotel Rooms",
  description: "2 rooms × 4 nights",
  quantity: 8,                  // 2 rooms × 4 nights
  unit: "night",
  unit_price: 200,
  total: 1600.00,               // 8 room-nights × $200
  is_travel_item: false,
  travel_item_type: "hotel"
}
```

**Per-Diem:**
```javascript
{
  item_name: "Per-Diem",
  description: "4 techs × 5 days",
  quantity: 20,                 // 4 techs × 5 days
  unit: "day",
  unit_price: 55,
  total: 1100.00,               // 20 person-days × $55
  is_travel_item: false,
  travel_item_type: "per_diem"
}
```

---

#### RESUMEN FINANCIERO DEL EJEMPLO

| Item | Quantity | Rate | Total |
|------|----------|------|-------|
| **Driving Time - Team LA** | 13.5h | $60/h | $810.00 |
| **Driving Time - Team SD** | 12.5h | $60/h | $750.00 |
| **Mileage - Team LA** | 836.7mi | $0.70/mi | $585.69 |
| **Mileage - Team SD** | 792.9mi | $0.70/mi | $555.03 |
| **Hotel Rooms** | 8 room-nights | $200/night | $1,600.00 |
| **Per-Diem** | 20 person-days | $55/day | $1,100.00 |
| **TOTAL OUT OF AREA** | — | — | **$5,400.72** |

---

## ⚙️ CONFIGURACIONES Y PARÁMETROS {#configuraciones}

### Parámetros Modificables por Usuario

| Parámetro | Default | Min | Max | Unidad | Afecta |
|-----------|---------|-----|-----|--------|--------|
| **Tech Count** | 2 | 1 | 20 | technicians | Work days, per diem, hotel rooms |
| **Rooms per Night** | ceil(techs/2) | 1 | 20 | rooms | Hotel room-nights |
| **Round Trips** | 1 | 1 | 10 | trips | Driving hours, mileage, calendar days |
| **Days per Trip** | 2 | 1 | 30 | days | Additional calendar days |
| **Nights per Trip** | 2 | 1 | 30 | nights | Total nights calculation |
| **Vehicles** | 1 | 1 | ∞ | vehicles/team | Total mileage per team |

### Parámetros Fijos (No Editables)

| Parámetro | Valor | Razón |
|-----------|-------|-------|
| **Hours per Day** | 8 | Jornada laboral estándar |
| **Work Days** | Mon-Fri | Calendario laboral |
| **Weekend Days** | Sat-Sun | Días no laborales |
| **Buffer de Mileage** | +10% | Desvíos, tráfico, seguridad |
| **Buffer de Driving** | +10% | Tráfico, paradas, seguridad |
| **Trigger de Travel Days** | > 4h | Criterio de viaje dedicado |

### Tarifas (CompanySettings)

| Concepto | Campo DB | Default Fallback |
|----------|----------|------------------|
| **Driving Time Rate** | `travel_driving_time_rate` | $60/hour |
| **Mileage Rate** | `travel_mileage_rate` | $0.70/mile |
| **Hotel Rate** | QuoteItem "Hotel Rooms" | $200/night |
| **Per Diem Rate** | QuoteItem "Per-Diem" | $55/day |

---

## 🧩 ITEMS GENERADOS AUTOMÁTICAMENTE {#items}

### Estructura de Travel Items

```javascript
// POR CADA EQUIPO VIAJANDO:

// 1. Driving Time
{
  item_name: `Driving Time - ${teamName}`,
  description: `${roundTrips} round trip(s) from ${teamLocation} to job site (${totalMiles} mi each)`,
  quantity: drivingHours × roundTrips,
  unit: "hours",
  unit_price: $60,
  total: quantity × unit_price,
  is_travel_item: true,          // ✅ MARCA COMO TRAVEL
  travel_item_type: "driving_time",
  team_id: teamId,
  round_trips: roundTrips,
  account_category: "expense_travel_per_diem",
  duration_value: totalDrivingHours,
  tech_count: 1
}

// 2. Mileage
{
  item_name: `Miles per Vehicle - ${teamName}`,
  description: `${vehicleCount} vehicle(s) × ${milesPerVehicle} miles × ${roundTrips} trip(s)`,
  quantity: totalMiles × vehicleCount × roundTrips,
  unit: "miles",
  unit_price: $0.70,
  total: quantity × unit_price,
  is_travel_item: true,          // ✅ MARCA COMO TRAVEL
  travel_item_type: "miles_per_vehicle",
  team_id: teamId,
  vehicle_count: vehicleCount,
  round_trips: roundTrips,
  account_category: "expense_travel_per_diem"
}
```

### Estructura de Stay Items

```javascript
// PARA TODO EL PROYECTO (NO POR EQUIPO):

// 3. Hotel Rooms
{
  item_name: "Hotel Rooms",
  description: `${roomsPerNight} room(s) × ${totalNights} night(s)`,
  quantity: totalHotelRooms,     // roomsPerNight × nights
  unit: "night",
  unit_price: $200,
  total: quantity × unit_price,
  is_travel_item: false,         // ❌ NO ES TRAVEL ITEM
  travel_item_type: "hotel",
  account_category: "expense_travel_per_diem",
  round_trips: 1,                // Ya incluido en quantity
  nights_per_trip: nightsPerTrip,
  rooms_per_night: roomsPerNight
}

// 4. Per-Diem
{
  item_name: "Per-Diem",
  description: `${techCount} tech(s) × ${totalCalendarDays} day(s)`,
  quantity: totalPerDiemDays,    // techCount × totalCalendarDays
  unit: "day",
  unit_price: $55,
  total: quantity × unit_price,
  is_travel_item: false,         // ❌ NO ES TRAVEL ITEM
  travel_item_type: "per_diem",
  account_category: "expense_travel_per_diem",
  round_trips: 1,                // Ya incluido en quantity
  days_per_trip: daysPerTrip,
  tech_count: techCount
}
```

### ⚠️ CRÍTICO: is_travel_item vs travel_item_type

**Confusión común:**

```javascript
// ❌ INCORRECTO - Pensar que todos tienen is_travel_item: true
Hotel Rooms:  is_travel_item: true   // ❌ NO
Per-Diem:     is_travel_item: true   // ❌ NO

// ✅ CORRECTO
Driving Time: is_travel_item: true   // ✅ SÍ (por equipo, múltiples)
Mileage:      is_travel_item: true   // ✅ SÍ (por equipo, múltiples)
Hotel Rooms:  is_travel_item: false  // ✅ NO (único, total del proyecto)
Per-Diem:     is_travel_item: false  // ✅ NO (único, total del proyecto)
```

**Razón:**
- `is_travel_item: true` → Se generan **múltiples** (uno por equipo viajando)
- `is_travel_item: false` → Se genera **uno solo** para todo el proyecto
- `travel_item_type` → Identifica el tipo de costo (para reportes)

---

## ✅ VALIDACIONES Y REGLAS DE NEGOCIO {#validaciones}

### Validación de Inputs

```javascript
// 1. Job Address requerido
if (!jobAddress) {
  error = "Enter job address";
  return;
}

// 2. Al menos 1 equipo seleccionado
if (selectedTeamIds.length === 0) {
  error = "Select at least one team";
  return;
}

// 3. Tech count válido
if (techCount < 1 || techCount > 20) {
  error = "Tech count must be between 1 and 20";
  return;
}

// 4. Rooms per night válido
if (roomsPerNight < 1 || roomsPerNight > 20) {
  error = "Rooms per night must be between 1 and 20";
  return;
}
```

### Hard Guards en computeQuoteDerived

```javascript
// HARD GUARD 1: Items debe ser array
if (!Array.isArray(items)) {
  throw new Error('[computeQuoteDerived] items must be an array');
}

// HARD GUARD 2: Techs debe ser positivo
if (typeof techs !== 'number' || techs <= 0) {
  throw new Error('[computeQuoteDerived] techs must be a positive number');
}

// HARD GUARD 3: Prevenir NaN
if (isNaN(rawWorkDays) || !isFinite(rawWorkDays)) {
  throw new Error('[computeQuoteDerived] Invalid work days calculation');
}

// HARD GUARD 4: Prevenir negativos
if (workDays < 0) {
  throw new Error('[computeQuoteDerived] Work days cannot be negative');
}

// HARD GUARD 5: Validar todos los outputs
for (const key in result) {
  if (typeof result[key] === 'number' && result[key] < 0) {
    throw new Error(`Negative value detected: ${key} = ${result[key]}`);
  }
}
```

### Reglas de Negocio

1. **Redondeo siempre ARRIBA:**
   - Work days: `Math.ceil()` - cobra días completos
   - Nights: `Math.ceil()` - cobra noches completas
   - Driving hours: `Math.ceil(x * 2) / 2` - redondea a 0.5h

2. **Buffer del 10%:**
   - Mileage: `actualMiles × 1.1`
   - Driving time: `actualHours × 1.1`
   - Razón: Desvíos, tráfico, paradas

3. **Travel days trigger:**
   - `if (travelHours > 4)` → Add 2 travel days
   - Lógica: >4h requiere día dedicado de viaje

4. **Default rooms:**
   - 2 técnicos por cuarto
   - `Math.ceil(techs / 2)`
   - Usuario puede override

5. **Múltiples trips:**
   - Cada trip adicional agrega `daysPerTrip` días
   - Formula: `(roundTrips - 1) × daysPerTrip`

---

## 🔗 INTERACCIÓN CON OTROS MÓDULOS {#integracion}

### 1. Integración con Quote Creation

```javascript
// En CrearEstimado.jsx

// PASO 1: Usuario configura y genera items
const handleAddAllOutOfAreaItems = (allItems, stayData) => {
  // Remove existing travel items
  const filteredItems = formData.items.filter(item => !item.is_travel_item);
  
  // Add new travel + stay items
  const finalItems = [...filteredItems, ...allItems];
  
  // Update stayConfig
  setStayConfig({
    roundTrips: stayData.round_trips,
    daysPerTrip: stayData.days_per_trip,
    nightsPerTrip: stayData.nights_per_trip,
    total_nights: stayData.total_nights,
    total_calendar_days: stayData.total_calendar_days
  });
  
  setFormData(prev => ({ ...prev, items: finalItems }));
};

// PASO 2: derivedValues se recalcula automáticamente (useMemo)
const derivedValues = useMemo(() => {
  const nonTravelItems = formData.items.filter(item => !item.is_travel_item);
  const input = createComputeInput({ ... });
  return computeQuoteDerived(input);
}, [formData.items, techCount, ...]);

// PASO 3: LineItemsEditor usa derivedValues para display
<LineItemsEditor 
  items={formData.items}
  derivedValues={derivedValues}
  onItemsChange={(newItems) => setFormData({ ...formData, items: newItems })}
/>
```

### 2. Sincronización con LineItemsEditor

**Hotel Rooms y Per-Diem son READ-ONLY:**

```javascript
// En LineItemsEditor.jsx

const isAutoCalculatedItem = (item) => {
  return item.auto_calculated === true && !item.manual_override;
};

// Quantity input deshabilitado para auto-calculated items
<Input
  type="number"
  value={item.quantity || 0}
  disabled={isAutoCalc && !item.manual_override}  // 🔒 BLOQUEADO
  className={isAutoCalc ? 'bg-blue-50 cursor-not-allowed' : 'bg-white'}
/>
```

**Si usuario intenta editar:**
```javascript
if (field === 'quantity' && isAutoCalculatedItem(newItems[index])) {
  newItems[index].manual_override = true;
  
  toast({
    title: '⚠️ Manual Override Enabled',
    description: 'This value will no longer update automatically.',
    variant: 'warning'
  });
}
```

### 3. Conversión Quote → Invoice

**CRÍTICO:** Items se copian como **snapshot** (sin flags derivados)

```javascript
// En CrearFactura.jsx - cuando carga desde quote

// SNAPSHOT: Remover flags de derivación
const snapshotItems = (quote.items || []).map(item => ({
  ...item,
  auto_calculated: false,    // ❌ Remover
  manual_override: false     // ❌ Remover
}));

setFormData({ ...formData, items: snapshotItems });
```

**Razón:**
- Invoice es **snapshot** del quote en ese momento
- NO debe recalcular valores automáticamente
- Editable 100% (snapshot puro)

---

## ⚠️ CASOS EDGE Y CONSIDERACIONES {#edge-cases}

### EDGE CASE 1: Zero Labor Hours

```javascript
items = []
techCount = 2

// Result:
derivedValues = {
  totalLaborHours: 0,
  workDays: 0,
  calendarDays: 0,
  nights: 0,
  hotelRooms: 0,
  perDiemDays: 0
}

// UI: ProjectDurationSummary no se muestra (return null)
```

### EDGE CASE 2: Travel < 4 horas

```javascript
travelHours = 3.5  // One-way
travelEnabled = true

// Result:
travelDays = 0  // NO se agregan días de viaje
totalCalendarDays = workCalendarDays + 0
```

**Calendario:**
```
Lunes: Salir 6am → Viajar 3.5h → Llegar 9:30am → Trabajar
Viernes: Trabajar → Viajar 3.5h → Llegar casa
```

### EDGE CASE 3: Trabajo muy corto (3 horas totales)

```javascript
totalLaborHours = 3h
techCount = 2
hoursPerDay = 8

rawWorkDays = 3 / (8 × 2) = 0.1875 días
workDays = Math.ceil(0.1875) = 1 día laboral ✅

calendarDays = 1
nights = Math.ceil(1 - 1) = 0 noches ❌

// ¿Problema? Trabajo de 1 día pero cero noches
// Solución: Usuario debe ajustar manualmente si requiere hospedaje
```

### EDGE CASE 4: Team sin base_address

```javascript
// calculateTravelMetrics response:
{
  teamId: "team_003",
  teamName: "Team Phoenix",
  error: "Team missing base_address",
  success: false  // ❌ No se calcula
}

// UI muestra error específico
// Usuario debe ir a Teams y configurar base_address
```

### EDGE CASE 5: Google Maps API falla

```javascript
// Error handling en backend:
if (data.status !== 'OK') {
  results.push({
    teamId,
    teamName,
    error: `Google Maps error: ${data.error_message}`,
    success: false
  });
}

// UI muestra:
// "Google Maps error: ZERO_RESULTS" o similar
```

### EDGE CASE 6: Múltiples trips con noches diferentes

```javascript
roundTrips = 3
nightsPerTrip = 2  // Base trip
daysPerTrip = 2    // Trips adicionales

// Primer trip: baseCalendarDays + travelDays
// Trip 2: +2 días
// Trip 3: +2 días

totalCalendarDays = base + (3 - 1) × 2 = base + 4
nights = Math.ceil(totalCalendarDays - 1)
```

---

## 🔄 SINCRONIZACIÓN AUTOMÁTICA

### ¿Cuándo se recalcula automáticamente?

**derivedValues se recalcula cuando cambia:**

```javascript
useMemo(() => {
  return computeQuoteDerived(input);
}, [
  formData.items,        // ✅ Si agregan/modifican items
  projectTechCount,      // ✅ Si cambia # de técnicos
  travelTimeHours,       // ✅ Si cambia tiempo de viaje
  roomsPerNight,         // ✅ Si cambia cuartos/noche
  stayConfig.roundTrips, // ✅ Si cambia # de viajes
  stayConfig.nightsPerTrip // ✅ Si cambia noches/viaje
]);
```

**Ejemplo de auto-sincronización:**

```
Usuario agrega item: "Panel Installation" (5h × 10 units = 50h)
↓
formData.items cambia
↓
useMemo detecta cambio
↓
computeQuoteDerived se ejecuta
↓
derivedValues actualiza: totalLaborHours = 80h → 130h
↓
workDays: 5 → 9
↓
calendarDays: 7 → 13
↓
nights: 6 → 12
↓
hotelRooms: 6 → 12 (si 1 room/night)
↓
perDiemDays: 14 → 26 (si 2 techs)
↓
LineItemsEditor muestra nuevas cantidades automáticamente
```

---

## 📐 FÓRMULAS COMPLETAS DE REFERENCIA

### Fórmula Master (Todo el flujo)

```javascript
// INPUT
items[]                     // Items de instalación con installation_time
techCount                   // Número de técnicos
hoursPerDay = 8            // Horas laborales por día
travelHours                // Tiempo de viaje one-way
roomsPerNight              // Cuartos por noche (default: ceil(techs/2))
roundTrips                 // Número de viajes
daysPerTrip                // Días por viaje adicional
nightsPerTrip              // Noches por viaje adicional

// STEP 1: Labor Hours
totalLaborHours = Σ(item.installation_time × item.quantity)

// STEP 2: Work Days (Mon-Fri only)
rawWorkDays = totalLaborHours / (hoursPerDay × techCount)
workDays = Math.ceil(rawWorkDays)

// STEP 3: Calendar Days (includes weekends)
fullWeeks = floor(workDays / 5)
remainingDays = workDays % 5
calendarDays = (fullWeeks × 7) + remainingDays + (remainingDays > 4 ? 2 : 0)

// STEP 4: Travel Days
travelDays = (travelHours > 4) ? 2 : 0

// STEP 5: Total Calendar Days
baseTotal = calendarDays + travelDays
additionalDays = (roundTrips - 1) × daysPerTrip
totalCalendarDays = baseTotal + additionalDays

// STEP 6: Nights
nights = Math.max(Math.ceil(totalCalendarDays - 1), 0)

// STEP 7: Hotel Rooms
hotelRooms = roomsPerNight × nights

// STEP 8: Per Diem
perDiemDays = techCount × totalCalendarDays

// OUTPUT
return {
  totalLaborHours,
  workDays,
  calendarDays,
  travelDays,
  totalCalendarDays,
  nights,
  hotelRooms,
  perDiemDays
}
```

---

## 🎓 EJEMPLO NUMÉRICO AVANZADO

### Escenario: Proyecto largo con múltiples trips

**Inputs:**
```javascript
items = [
  { installation_time: 8, quantity: 30 },   // 240h
  { installation_time: 4, quantity: 20 },   // 80h
  { installation_time: 2, quantity: 40 }    // 80h
]
totalLaborHours = 400h

techCount = 5 técnicos
hoursPerDay = 8
travelHours = 6.5  // Phoenix desde LA
roomsPerNight = 3  // 5 techs / 2 = 2.5 → 3 rooms
roundTrips = 2     // ¡Dos viajes!
daysPerTrip = 3
nightsPerTrip = 3
```

**Cálculos:**

```javascript
// STEP 1: Labor hours
totalLaborHours = 400h ✓

// STEP 2: Work days
rawWorkDays = 400 / (8 × 5) = 400 / 40 = 10 días exactos
workDays = Math.ceil(10) = 10 días laborales

// STEP 3: Calendar days (base project)
fullWeeks = floor(10 / 5) = 2 semanas completas
remainingDays = 10 % 5 = 0
calendarDays = (2 × 7) + 0 + 0 = 14 días calendario

// STEP 4: Travel days
travelHours = 6.5 > 4 ✅
travelDays = 2 días

// STEP 5: Total calendar days
baseTotal = 14 + 2 = 16 días (primera visita)
additionalDays = (2 - 1) × 3 = 3 días (segundo viaje)
totalCalendarDays = 16 + 3 = 19 días

// STEP 6: Nights
nights = Math.ceil(19 - 1) = Math.ceil(18) = 18 noches

// STEP 7: Hotel rooms
hotelRooms = 3 × 18 = 54 room-nights

// STEP 8: Per diem
perDiemDays = 5 × 19 = 95 person-days
```

**Calendario detallado:**

```
TRIP 1 (Primera visita - 16 días):
Dom (1):  Viaje → Phoenix (check in hotel)
Lun (2):  Trabajo semana 1
Mar (3):  Trabajo
Mié (4):  Trabajo
Jue (5):  Trabajo
Vie (6):  Trabajo
Sáb (7):  Weekend (hotel)
Dom (8):  Weekend (hotel)
Lun (9):  Trabajo semana 2
Mar (10): Trabajo
Mié (11): Trabajo
Jue (12): Trabajo
Vie (13): Trabajo
Sáb (14): Weekend (hotel)
Dom (15): Weekend (hotel)
Lun (16): Viaje de regreso (check out)

TRIP 2 (Segunda visita - 3 días):
Vie (17): Viaje → Phoenix (check in hotel)
Sáb (18): Trabajo final
Dom (19): Viaje de regreso (check out)

Total: 19 días calendario, 18 noches
```

**Totales financieros:**
```javascript
// Travel items (por equipo - ejemplo 1 equipo):
Driving Time:     13h × 2 trips = 26h × $60 = $1,560
Mileage:         837mi × 1 vehicle × 2 trips = 1,674mi × $0.70 = $1,171.80

// Stay items:
Hotel Rooms:     54 room-nights × $200 = $10,800
Per-Diem:        95 person-days × $55 = $5,225

// TOTAL OUT OF AREA (1 equipo): $18,756.80
```

---

## 🛡️ ANTI-PATRONES Y GUARDAS

### ❌ ANTI-PATRÓN 1: Editar quantities manualmente

```javascript
// ❌ NUNCA HACER:
const hotelItem = items.find(i => i.calculation_type === 'hotel');
hotelItem.quantity = 10; // Manual edit
```

**Problema:**
- Rompe sincronización con project duration
- Causa inconsistencias financieras
- Sobrescrito en próximo recalc

**✅ SOLUCIÓN:**
```javascript
// Cambiar inputs que afectan el cálculo:
setRoomsPerNight(2);      // ✓ Afecta hotelRooms
setProjectTechCount(3);   // ✓ Recalcula workDays
```

### ❌ ANTI-PATRÓN 2: Duplicar lógica de cálculo

```javascript
// ❌ NUNCA HACER (en otro archivo):
const calculateHotelNights = (hours, techs) => {
  const days = hours / (8 × techs);
  return Math.ceil(days - 1);
};
```

**Problema:**
- Duplica lógica de computeQuoteDerived
- Puede divergir y causar inconsistencias
- Viola SINGLE SOURCE OF TRUTH

**✅ SOLUCIÓN:**
```javascript
// SIEMPRE usar:
import { computeQuoteDerived } from '@/components/domain/quotes/computeQuoteDerived';
const derived = computeQuoteDerived(input);
const nights = derived.nights;
```

### ❌ ANTI-PATRÓN 3: Modificar items después de agregar

```javascript
// ❌ NUNCA HACER:
const handleAddAllOutOfAreaItems = (allItems) => {
  setFormData({ ...formData, items: [...formData.items, ...allItems] });
  
  // ❌ Modificar después
  setTimeout(() => {
    formData.items[0].quantity = 20;
  }, 100);
};
```

**Problema:**
- Timing issues (estado puede cambiar antes)
- Rompe inmutabilidad
- Causa race conditions

**✅ SOLUCIÓN:**
```javascript
const handleAddAllOutOfAreaItems = (allItems) => {
  // Modificar ANTES de setState
  const modifiedItems = allItems.map(item => ({
    ...item,
    custom_field: value
  }));
  
  setFormData({ ...formData, items: [...formData.items, ...modifiedItems] });
};
```

---

## 📊 VERIFICACIÓN DE INTEGRIDAD

### Checklist de Validación

**Al crear quote con Out of Area:**

```javascript
// ✅ Verificar items travel correctos
const drivingItems = items.filter(i => i.travel_item_type === 'driving_time');
console.assert(drivingItems.length === selectedTeamIds.length, 
  'Each team must have 1 driving time item');

const mileageItems = items.filter(i => i.travel_item_type === 'miles_per_vehicle');
console.assert(mileageItems.length === selectedTeamIds.length, 
  'Each team must have 1 mileage item');

const hotelItems = items.filter(i => i.travel_item_type === 'hotel');
console.assert(hotelItems.length === 1, 
  'Exactly 1 hotel item for whole project');

const perDiemItems = items.filter(i => i.travel_item_type === 'per_diem');
console.assert(perDiemItems.length === 1, 
  'Exactly 1 per diem item for whole project');

// ✅ Verificar cantidades coherentes
const hotelNights = hotelItems[0].quantity / roomsPerNight;
const perDiemDays = perDiemItems[0].quantity / techCount;
console.assert(hotelNights <= perDiemDays, 
  'Hotel nights cannot exceed per diem days');

// ✅ Verificar totals
drivingItems.forEach(item => {
  console.assert(item.total === item.quantity × item.unit_price,
    'Driving total mismatch');
});
```

---

## 🔧 TROUBLESHOOTING COMÚN

### Problema 1: "Hotel rooms = 0"

**Síntoma:**
```javascript
derivedValues.hotelRooms = 0
```

**Diagnóstico:**
```javascript
console.log('totalLaborHours:', derivedValues.totalLaborHours);
console.log('workDays:', derivedValues.workDays);
console.log('nights:', derivedValues.nights);
```

**Causas posibles:**
- ❌ Items sin `installation_time`
- ❌ techCount = 0 o undefined
- ❌ Todos los items tienen `is_travel_item: true`

**Solución:**
```javascript
// Asegurar items válidos con installation_time
items = items.map(i => ({
  ...i,
  installation_time: i.installation_time || 0
}));
```

### Problema 2: "Quantities no se actualizan"

**Síntoma:**
- Usuario agrega items
- Hotel/per diem no cambian

**Diagnóstico:**
```javascript
// Verificar dependencies de useMemo
console.log('Items changed?', prevItems !== formData.items);
console.log('Derived recalculated?', derived);
```

**Causa:**
- useMemo no detecta cambio (referencia igual)

**Solución:**
```javascript
// SIEMPRE crear nuevo array al modificar
setFormData({
  ...formData,
  items: [...formData.items, newItem]  // ✅ Nuevo array
});

// ❌ NO HACER:
formData.items.push(newItem);  // Muta array existente
setFormData(formData);         // Same reference
```

### Problema 3: "Google Maps error"

**Síntoma:**
```
Error: "GOOGLE_MAPS_API_KEY not configured"
```

**Solución:**
1. Verificar secret en Dashboard → Settings → Environment Variables
2. Verificar que key sea válida y tenga Distance Matrix API habilitado
3. Verificar billing habilitado en Google Cloud Console

---

## 🎯 CONCLUSIONES Y MEJORES PRÁCTICAS

### DO's ✅

1. **SIEMPRE usar computeQuoteDerived** para cálculos derivados
2. **SIEMPRE validar inputs** antes de calcular
3. **SIEMPRE aplicar buffer** a distancias y tiempos
4. **SIEMPRE redondear arriba** para días y noches
5. **SIEMPRE crear arrays nuevos** al modificar state
6. **SIEMPRE remover flags** al convertir Quote → Invoice

### DON'Ts ❌

1. **NUNCA duplicar lógica** de cálculo de duración
2. **NUNCA editar quantities** de hotel/per diem manualmente
3. **NUNCA mutar arrays** directamente
4. **NUNCA asumir** que Google Maps siempre funciona
5. **NUNCA hardcodear** rates (usar CompanySettings)
6. **NUNCA mezclar** travel_item types en mismo item

---

## 📌 REFERENCIAS RÁPIDAS

### Ubicaciones de Código

| Componente | Archivo | Líneas |
|------------|---------|--------|
| UI Calculator | `components/quotes/UnifiedOutOfAreaCalculator.jsx` | 1-562 |
| Compute Engine | `components/domain/quotes/computeQuoteDerived.jsx` | 177-378 |
| Backend API | `functions/calculateTravelMetrics.js` | 1-110 |
| Quote Root | `pages/CrearEstimado.jsx` | 161-181 (useMemo) |
| Stay Duration | `components/domain/calculations/stayDuration.js` | 62-141 |
| Display Summary | `components/quotes/ProjectDurationSummary.jsx` | 1-296 |

### Constantes Importantes

```javascript
HOURS_PER_DAY = 8
WORK_DAYS = [1, 2, 3, 4, 5]  // Mon-Fri
WEEKEND_DAYS = [0, 6]         // Sat-Sun
TRAVEL_THRESHOLD = 4          // hours
MILEAGE_BUFFER = 1.10         // +10%
DRIVING_BUFFER = 1.10         // +10%
DEFAULT_TECHS_PER_ROOM = 2
DEFAULT_DRIVING_RATE = 60     // USD/hour
DEFAULT_MILEAGE_RATE = 0.70   // USD/mile
DEFAULT_HOTEL_RATE = 200      // USD/night
DEFAULT_PER_DIEM_RATE = 55    // USD/day
```

---

## 📋 AUDIT CHECKLIST

Al revisar un quote con Out of Area:

- [ ] Travel items existen (1 driving + 1 mileage por equipo)
- [ ] Stay items existen (1 hotel + 1 per diem total)
- [ ] Driving hours tienen 10% buffer aplicado
- [ ] Mileage tiene 10% buffer aplicado
- [ ] Hotel rooms = roomsPerNight × nights
- [ ] Per diem = techCount × totalCalendarDays
- [ ] Nights ≤ totalCalendarDays
- [ ] Work days ≤ calendar days
- [ ] Travel days = 0 o 2 (nunca 1)
- [ ] Todos los items tienen `account_category`
- [ ] Travel items tienen `is_travel_item: true`
- [ ] Stay items tienen `is_travel_item: false`
- [ ] Todas las quantities son positivas
- [ ] Todos los totals = quantity × unit_price

---

**FIN DE LA AUDITORÍA**

*Documento generado: 17 de febrero de 2026*  
*Sistema: MCI Connect v2.0*  
*Autor: Base44 AI Assistant*