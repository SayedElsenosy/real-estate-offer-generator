import { neon } from "@neondatabase/serverless";
import type { User, Project, PaymentPlan, FloorPlan, Account } from "@/generated/prisma/client";
import { vidaWorkbookPlans } from "@/lib/vida-payments";

// Parameterized, stateless HTTP queries for the shared-link read path. Avoid
// initializing Prisma's WASM query compiler on every public request. Admin
// writes and OAuth transactions continue to use the existing Prisma adapter.
async function query<T>(sql: string, parameters: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return await neon(url).query(sql, parameters) as T[];
}
export async function readSharedOwner(email: string) {
  return (await query<User>('SELECT * FROM "User" WHERE lower(email) = lower($1) LIMIT 1', [email]))[0] ?? null;
}
export async function readStudioProjects() {
  const projects = await query<Pick<Project,"id"|"slug"|"name">>('SELECT id, slug, name FROM "Project" ORDER BY name');
  const plans = await query<PaymentPlan>('SELECT * FROM "PaymentPlan" ORDER BY "createdAt", id');
  return projects.map(p => ({...p, paymentPlans: [
    ...plans.filter(plan => plan.projectId === p.id),
    ...(p.id==="vida" ? vidaWorkbookPlans():[])
  ]}));
}
export async function readPublicProject(id: string, floors: boolean | string = false) {
  const project = (await query<Project>('SELECT * FROM "Project" WHERE id = $1', [id]))[0];
  if (!project) return null;
  const floorPlans = floors === false ? [] : typeof floors === "string"
    ? await query<FloorPlan>('SELECT * FROM "FloorPlan" WHERE "projectId" = $1 AND floor = $2 AND "reviewStatus" = $3', [id, floors, 'APPROVED'])
    : await query<FloorPlan>('SELECT * FROM "FloorPlan" WHERE "projectId" = $1', [id]);
  return {...project, floorPlans};
}
export async function readOfferPlans(projectId: string, ids: string[]) {
  const saved=await query<PaymentPlan>('SELECT * FROM "PaymentPlan" WHERE "projectId" = $1 AND id = ANY($2::text[])', [projectId, ids]);
  return [...saved,...(projectId==="vida" ? vidaWorkbookPlans().filter(p=>ids.includes(p.id)):[])];
}
export async function readGoogleAccount(userId: string) {
  return (await query<Account>('SELECT * FROM "Account" WHERE "userId" = $1 AND provider = $2 LIMIT 1', [userId, 'google']))[0] ?? null;
}
export async function saveGoogleAccessToken(id: string, token: string, expires: number) {
  await query('UPDATE "Account" SET access_token = $2, expires_at = $3 WHERE id = $1', [id, token, expires]);
}
