/**
 * Prints how MongoDB executes the main list and dashboard queries: which index it picks and how
 * many keys/documents it reads. Usage: npm run db:explain (most useful after npm run seed)
 */
import { connectDb, disconnectDb } from '../config/db.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { NotificationModel, NOTIFICATION_TTL_SECONDS } from '../modules/notifications/notification.model.js';
import { PatientModel } from '../modules/patients/patient.model.js';
import { searchKeyFilter } from '../lib/search-key.js';

type PlanNode = { stage: string; indexName?: string; inputStage?: PlanNode; inputStages?: PlanNode[] };
type Planner = {
  winningPlan: PlanNode & { queryPlan?: PlanNode };
  rejectedPlans: Array<PlanNode & { queryPlan?: PlanNode }>;
};
type Stats = { nReturned: number; totalKeysExamined: number; totalDocsExamined: number; executionTimeMillis: number };
// find() explains have the plan at the top; an aggregation that MongoDB can't run entirely inside
// the query engine nests it under its first stage ($cursor).
type ExplainResult = {
  queryPlanner?: Planner;
  executionStats?: Stats;
  stages?: Array<{ $cursor?: { queryPlanner: Planner; executionStats: Stats } }>;
};

function describePlan(node: PlanNode | undefined): string {
  if (!node) return '';
  const label = node.indexName ? `${node.stage}(${node.indexName})` : node.stage;
  const children = [node.inputStage, ...(node.inputStages ?? [])].filter(Boolean) as PlanNode[];
  return children.length ? `${label} ← ${children.map(describePlan).join(' + ')}` : label;
}

type Explainable = { explain: (verbosity: 'executionStats') => Promise<unknown> };

await connectDb();
await Promise.all([DoctorModel.init(), PatientModel.init(), NotificationModel.init()]);

// Real values make the plans meaningful (keys examined > 0); fall back to fixed ones on an empty DB.
const [sampleDoctor, samplePatient] = await Promise.all([
  DoctorModel.findOne().select('name').lean(),
  PatientModel.findOne().select('name doctorId').lean(),
]);
const doctorId = samplePatient?.doctorId?.toString() ?? '000000000000000000000000';
const doctorTerm = sampleDoctor?.name.split(' ').at(-1)?.toLowerCase() ?? 'aisha';
const patientTerm = samplePatient?.name.split(' ')[0]?.toLowerCase() ?? 'maya';
const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
const sampleSubjectId = (await NotificationModel.findOne().select('subject.id').lean())?.subject.id ?? '000000000000000000000000';
const groupBy = (field: string) => [{ $sort: { [field]: 1 as const } }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }];

const queries: Array<[string, Explainable]> = [
  ['doctors: default list (newest first)', DoctorModel.find({}).sort({ createdAt: -1, _id: -1 }).limit(10)],
  [`doctors: search "${doctorTerm}"`, DoctorModel.find({ searchKey: searchKeyFilter(doctorTerm) }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: specialization filter', DoctorModel.find({ specialization: 'Cardiology' }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: status filter', DoctorModel.find({ status: 'active' }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: hospital filter', DoctorModel.find({ hospital: 'Lakeview Hospital' }).sort({ createdAt: -1, _id: -1 }).limit(10)],
  ['doctors: joined date range', DoctorModel.find({ joinedAt: { $gte: new Date('2024-01-01') } }).sort({ joinedAt: -1, _id: -1 }).limit(10)],
  ['doctors: sort by name', DoctorModel.find({}).sort({ name: 1, _id: 1 }).limit(10)],
  ['patients: by doctor (delete guard / counts)', PatientModel.find({ doctorId }).limit(1)],
  ['patients: default list (newest admission)', PatientModel.find({}).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  [`patients: search "${patientTerm}"`, PatientModel.find({ searchKey: searchKeyFilter(patientTerm) }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ["patients: one doctor's list", PatientModel.find({ doctorId }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: condition filter', PatientModel.find({ condition: 'Asthma' }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: status filter', PatientModel.find({ status: 'under_treatment' }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: admission date range', PatientModel.find({ admissionDate: { $gte: new Date('2026-01-01') } }).sort({ admissionDate: -1, _id: -1 }).limit(10)],
  ['patients: sort by name', PatientModel.find({}).sort({ name: 1, _id: 1 }).limit(10)],
  // countDocuments() can't be explained directly; it runs as $match + count, which is what these show.
  ['dashboard: active doctors (count)', DoctorModel.aggregate([{ $match: { status: 'active' } }, { $count: 'n' }])],
  ['dashboard: new patients, 30d (count)', PatientModel.aggregate([{ $match: { admissionDate: { $gte: thirtyDaysAgo } } }, { $count: 'n' }])],
  [
    'dashboard: patients over time (30d)',
    PatientModel.aggregate([
      { $match: { admissionDate: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateTrunc: { date: '$admissionDate', unit: 'day', timezone: 'UTC' } }, count: { $sum: 1 } } },
    ]),
  ],
  ['dashboard: top doctors (group by doctor)', PatientModel.aggregate([...groupBy('doctorId'), { $sort: { count: -1, _id: 1 } }, { $limit: 10 }])],
  ['dashboard: patients by condition', PatientModel.aggregate(groupBy('condition'))],
  ['dashboard: patients by status', PatientModel.aggregate(groupBy('status'))],
  ['dashboard: doctors by specialization', DoctorModel.aggregate(groupBy('specialization'))],
  ['notifications: latest 20 (topbar bell)', NotificationModel.find({}).sort({ createdAt: -1, _id: -1 }).limit(20)],
  ['notifications: unread count / mark all read', NotificationModel.aggregate([{ $match: { readAt: null } }, { $count: 'n' }])],
  ['notifications: cleanup for a deleted subject', NotificationModel.find({ 'subject.id': sampleSubjectId })],
];

for (const [label, query] of queries) {
  const result = (await query.explain('executionStats')) as ExplainResult;
  const planner = result.queryPlanner ?? result.stages?.[0]?.$cursor?.queryPlanner;
  const stats = result.executionStats ?? result.stages?.[0]?.$cursor?.executionStats;
  if (!planner || !stats) {
    console.log(`\n?  ${label}: unexpected explain format`);
    continue;
  }

  const plan = planner.winningPlan.queryPlan ?? planner.winningPlan;
  const scan = describePlan(plan).includes('COLLSCAN') ? '⚠ COLLSCAN' : '✓ index';
  const rejected = planner.rejectedPlans.map((p) => describePlan(p.queryPlan ?? p));

  console.log(`\n${scan}  ${label}`);
  console.log(`   plan: ${describePlan(plan)}`);
  if (rejected.length) console.log(`   also considered: ${rejected.join('  |  ')}`);
  console.log(
    `   returned ${stats.nReturned} · keys examined ${stats.totalKeysExamined} · docs examined ${stats.totalDocsExamined} · ${stats.executionTimeMillis} ms`,
  );
}

// The TTL index isn't used by queries: MongoDB's TTL monitor reads it to delete old notifications.
const ttl = (await NotificationModel.collection.indexes()).find((index) => index.expireAfterSeconds !== undefined);
console.log(
  ttl?.expireAfterSeconds === NOTIFICATION_TTL_SECONDS
    ? `\n✓ TTL  notifications.${ttl.name}: removed after ${ttl.expireAfterSeconds / 86_400} days`
    : '\n⚠ TTL  notifications: TTL index missing or out of date (run npm run seed or db:sync)',
);

await disconnectDb();
