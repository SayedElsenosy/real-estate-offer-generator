import type {PaymentTerms} from "@/lib/payment";

/** Exact Vida payment-plan exceptions, cross-checked against user-supplied
 * NEW VIDA 24-9-2026.xlsx (Main): the 8y 5% at month 30 replaces an ordinary
 * quarter; the 6.5y 5% at month 3 precedes 25 ordinary payments.
 * Maintenance is 8% of original LIST price even for discounted plans.
 */
export function projectPaymentOverrides(
  projectId:string, planId:string
):Partial<PaymentTerms>{
  if(projectId!=="vida")return {};
  if(planId==="vida-8-years")return {
    regularBeforeSecondDown:true,maintenanceOnOriginalPrice:true
  };
  if(planId==="vida-6-5-years")return {
    regularBeforeSecondDown:false,maintenanceOnOriginalPrice:true
  };
  return {};
}
