/**
 * AGREEMENTS CONFIGURATION
 * Central source of truth for compensation agreements
 */

export const AGREEMENTS = {
  manager_variable_comp: {
    type: 'manager_variable_comp',
    version: 'v1.0',
    title: {
      en: 'Variable Compensation Agreement — Manager/Supervisor',
      es: 'Acuerdo de Compensación Variable — Manager/Supervisor'
    },
    body: {
      en: `
**Role:** Key Supervisor / Manager with direct impact on profitability.

**Variable Commission:** 10%–15% based on performance.

**Criteria for percentage:**
- **10%:** Meets minimum objectives, maintains operational control, consistent delivery.
- **12%–13%:** Improves productivity, reduces waste/rework, good coordination.
- **15%:** Sustained high performance, direct impact on sales/costs, outstanding leadership and results.

**Calculation Base:** Defined by MCI (per Job/project or net profit of the project, as applicable).

**Conditions:**
- Not automatic.
- Subject to review and approval by MCI.
- May vary based on period/project results.
- Does not apply if there are significant losses, safety violations, or serious claims.

**Effective Date:** Applies from signature date.

**Acceptance:** By signing, the employee acknowledges and accepts these terms.
      `,
      es: `
**Rol:** Supervisor clave / Manager con impacto directo en ganancias.

**Comisión Variable:** 10%–15% según desempeño.

**Criterios para porcentaje:**
- **10%:** Cumple objetivos mínimos, mantiene control operativo, entrega consistente.
- **12%–13%:** Mejora productividad, reduce pérdidas/retrabajo, buena coordinación.
- **15%:** Alto desempeño sostenido, impacto directo en ventas/costos, liderazgo y resultados sobresalientes.

**Base de cálculo:** Definida por MCI (por Job/proyecto o por utilidad neta del proyecto, según corresponda).

**Condiciones:**
- No es automática.
- Se revisa y aprueba por MCI.
- Puede variar según resultados del periodo/proyecto.
- No aplica si hay pérdidas significativas, incumplimientos de seguridad, o reclamos graves.

**Vigencia:** Se aplica desde la fecha de firma.

**Aceptación:** Al firmar, el empleado reconoce y acepta estos términos.
      `
    },
    appliesTo: (user) => {
      const pos = (user?.position || '').toLowerCase();
      const role = (user?.role || '').toLowerCase();
      
      // Apply to managers, supervisors, and administrators (normalize variants)
      return pos.includes('manager') || 
             pos.includes('supervisor') || 
             pos.includes('administrator') || 
             pos === 'admin' ||
             (role === 'admin' && pos !== 'ceo');
    }
  },

  foreman_variable_comp: {
    type: 'foreman_variable_comp',
    version: 'v1.0',
    title: {
      en: 'Variable Compensation Agreement — Foreman',
      es: 'Acuerdo de Compensación Variable — Foreman'
    },
    body: {
      en: `
**Role:** Foreman / Field Supervisor.

**Variable Commission:** 1%–3% based on performance per Job.

**Levels:**
- **1%:** Meets basic scope, delivery without major claims and within standard.
- **2%:** Good team control, reduces rework, optimizes time without lowering quality.
- **3%:** High performance: reduces costs/waste, delivers before deadline, positive client feedback, proactive problem-solving.

**Calculation Base:** Defined by MCI (total Job billing or net profit of the Job, net profit recommended).

**Conditions:**
- Not automatic.
- Subject to review and approval by MCI.
- Does not apply if there are losses, safety violations, or serious claims.

**Effective Date:** From signature date.

**Acceptance:** By signing, the employee acknowledges and accepts these terms.
      `,
      es: `
**Rol:** Foreman / Supervisor de Campo.

**Comisión Variable:** 1%–3% según desempeño por Job.

**Niveles:**
- **1%:** Cumple alcance básico, entrega sin reclamos mayores y dentro de estándar.
- **2%:** Buen control de equipo, reduce retrabajos, optimiza tiempos sin bajar calidad.
- **3%:** Alto desempeño: reduce costos/desperdicio, entrega antes del deadline, feedback positivo del cliente, solución proactiva de problemas.

**Base de cálculo:** Definida por MCI (total facturado del Job o utilidad neta del Job, recomendado utilidad neta).

**Condiciones:**
- No es automática.
- Sujeta a revisión y aprobación por MCI.
- No aplica si hay pérdidas, incumplimientos de seguridad o reclamos graves.

**Vigencia:** Desde la fecha de firma.

**Aceptación:** Al firmar, el empleado reconoce y acepta estos términos.
      `
    },
    appliesTo: (user) => {
      const pos = (user?.position || '').toLowerCase();
      return pos.includes('foreman');
    }
  }
};

/**
 * Get required agreements for a user based on their role
 */
export function getRequiredAgreements(user) {
  if (!user) return [];
  
  const required = [];
  
  Object.values(AGREEMENTS).forEach(agreement => {
    if (agreement.appliesTo(user)) {
      required.push(agreement);
    }
  });
  
  return required;
}

/**
 * Check if user has signed all required agreements
 */
export function hasSignedAllAgreements(user, signatures) {
  if (!user || !signatures) return true;
  
  const required = getRequiredAgreements(user);
  if (required.length === 0) return true;
  
  return required.every(agreement => {
    return signatures.some(sig => 
      sig.agreement_type === agreement.type && 
      sig.version === agreement.version &&
      sig.accepted === true
    );
  });
}