/**
 * Prints how MongoDB executes the main list queries: which index it picks and how many
 * keys/documents it reads. Usage: npm run db:explain
 */
import { connectDb, disconnectDb } from '../config/db.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { PatientModel } from '../modules/patients/patient.model.js';
import { searchKeyFilter } from '../lib/search-key.js';

type PlanNode = { stage: string; indexName?: string; inputStage?: PlanNode; inputStages?: PlanNode[] };
type ExplainResult = {
  queryPlanner: {
    winningPlan: PlanNode & { queryPlan?: PlanNode };
    rejectedPlans: Array<PlanNode & { queryPlan?: PlanNode }>;
  };
  executionStats: { nReturned: number; totalKeysExamined: number; totalDocsExamined: number; executionTimeMillis: number };
};

function describePlan(node: PlanNode | undefined): string {
  if (!node) return '';
  const label = node.indexName ? `${node.stage}(${node.indexName})` : node.stage;
  const children = [node.inputStage, ...(node.inputStages ?? [])].filter(Boolean) as PlanNode[];
  return children.length ? `${label} ← ${children.map(describePlan).join(' + ')}` : label;
}

type Explainable = { explain: (verbosity: 'executionStats') => Promise<unknown> };

await connectDb();
await Promise.all([DoctorModel.init(), PatientModel.init()]);

// A doctor who has patients makes the per-doctor plans meaningful; falls back to a dummy id on an empty DB.
const samplePatient = await PatientModel.findOne().select('doctorId').lean();
const doctorId = samplePatient?.doctorId.toString() ?? '000000000000000000000000';

const queries: Array<[string, Explainable]> = [
  ['doctors: default list (newest first)', DoctorModel.find({}).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: search "aisha"', DoctorModel.find({ searchKey: searchKeyFilter('aisha') }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: specialization filter', DoctorModel.find({ specialization: 'Cardiology' }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: status filter', DoctorModel.find({ status: 'active' }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: hospital filter', DoctorModel.find({ hospital: 'City General' }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: joined date range', DoctorModel.find({ joinedAt: { $gte: new Date('2024-01-01') } }).sort({ joinedAt: -1, _id: -1 }).limit(10)],
  ['doctors: sort by name', DoctorModel.find({}).sort({ name: 1, _id: 1 }).limit(10)],
  ['patients: by doctor (delete guard / counts)', PatientModel.find({ doctorId }).limit(1)],
  ['patients: default list (newest admission)', PatientModel.find({}).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: search "maya"', PatientModel.find({ searchKey: searchKeyFilter('maya') }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ["patients: one doctor's list", PatientModel.find({ doctorId }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: condition filter', PatientModel.find({ condition: 'Asthma' }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: status filter', PatientModel.find({ status: 'under_treatment' }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: admission date range', PatientModel.find({ admissionDate: { $gte: new Date('2026-01-01') } }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: sort by name', PatientModel.find({}).sort({ name: 1, _id: 1 }).limit(10)],
];

for (const [label, query] of queries) {
  const result = (await query.explain('executionStats')) as ExplainResult;
  const plan = result.queryPlanner.winningPlan.queryPlan ?? result.queryPlanner.winningPlan;
  const stats = result.executionStats;
  const scan = describePlan(plan).includes('COLLSCAN') ? '⚠ COLLSCAN' : '✓ index';

  const rejected = result.queryPlanner.rejectedPlans.map((p) => describePlan(p.queryPlan ?? p));

  console.log(`\n${scan}  ${label}`);
  console.log(`   plan: ${describePlan(plan)}`);
  if (rejected.length) console.log(`   also considered: ${rejected.join('  |  ')}`);
  console.log(
    `   returned ${stats.nReturned} · keys examined ${stats.totalKeysExamined} · docs examined ${stats.totalDocsExamined} · ${stats.executionTimeMillis} ms`,
  );
}

await disconnectDb();
