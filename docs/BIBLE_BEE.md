**Task:** Extend the existing **Demo/IndexedDB** prototype to integrate **Bible Bee** functionality end-to-end, following the specs and user stories below. Keep everything **client-side** (IndexedDB only). Make the code modular so we can replace the DAL later without rewrites.

---

## Personas & Mapping (use these names in the UI)

- **Family Administrator** → **Primary Guardian** (parent who manages household)
- **Student** → **Child**
- **Administrator** → **Admin**
- **Bible Bee Leader/Volunteer** → **Ministry Leader (Bible Bee)**
  _(Leader has read access to Bible Bee progress for their assigned kids; Admin has full configuration privileges.)_

---

## Core Bible Bee Business Rules

1. **Competition Years**

   - Admins create competition years (e.g., 2025) with open/close dates and description.
   - Scriptures belong to a competition year (not per student).

2. **Scriptures & Essays**

   - Admins curate a scripture list per competition year.
   - Admins configure **grade-based rules**:

     - Younger grades: memorize scriptures with a **target count** (e.g., 20 verses).
     - Older grades: see an **essay prompt** instead of scripture memorization.

   - Assignment is **idempotent**: re-enrolling or re-assigning never creates duplicates.

3. **Enrollment & Auto-Assignment**

   - During annual registration, when a parent enrolls a child into Bible Bee for the selected **competition year**, the system bulk-assigns that year’s scriptures to the child (or assigns the essay flow if their grade falls in the configured essay range).

4. **Progress Tracking**

   - Students (or their parents) **check off** scriptures as learned; the system updates the `StudentScripture` record with `completed` + timestamp and auto-recomputes progress (counts, % toward target).
   - For essay flow, show an **essay prompt/instructions** and allow a simple “submitted” toggle (no numeric scores).

5. **CSV Import (client-only)**

   - Admin can upload a CSV **in the browser** to add/update scriptures for a specific competition year.
   - Provide a **preview/validation** step (no server). Commit to Dexie only after confirmation.

6. **Permissions (client-enforced for demo)**

   - **Admin**: manage competition years, scriptures, grade rules, essay prompts, and run imports.
   - **Family Admin (Parent)**: manage own household and enroll their children.
   - **Leader (Bible Bee)**: read-only dashboards for assigned children’s Bible Bee progress.
     _(In demo, permissions are UI-enforced; there’s no server.)_

---

## Prioritized User Stories + Acceptance Criteria (MVP)

1. **Admin: Manage Competition Years & Scriptures**

- Create/edit/delete competition years.
- Add scriptures individually or via CSV import (preview → validate → commit).
- Acceptance:

  - Year appears in list; scriptures saved under that year; sorts and filters by year work.
  - CSV upload shows a preview table with validation messages; commit writes to Dexie.

2. **Parent/Family Admin: Enroll Child in Bible Bee**

- During registration (or from child profile), select Bible Bee + competition year.
- System bulk-assigns scriptures (or essay) for that year to the child (idempotent).
- Acceptance:

  - Child displays `enrolledCompetitionYear` and assigned items; repeated enroll clicks do not create duplicates.

3. **Student/Parent: Check Off Progress**

- View assigned scriptures grouped by year, tap to mark “completed”.
- For essay flow, show prompt/instructions and a “submitted” toggle.
- Acceptance:

  - `StudentScripture.completed` and `completed_at` update; progress aggregates in UI update immediately (optimistic UI).
  - Essay shows submitted status and timestamp.

4. **Admin/Leader: View Dashboards**

- Admin sees per-student/per-family progress with targets vs actuals; filter by year/grade ranges.
- Leader sees read-only roster and progress for Bible Bee assignments they lead.
- Acceptance:

  - Progress bars show `completed/target` and %; filters work; Leader has no edit controls.

5. **Admin: Configure Grade Rules & Essay Flow**

- Create **grade target rules** for scripture memorization and **essay ranges** for older students.
- Acceptance:

  - Rules stored and applied when rendering dashboards and on enrollment assignment; changing a rule updates UI calculations, not historical assignments.

---

## Dexie (IndexedDB) Schema Additions

> Keep your existing tables (Households, Guardians, Children, etc.). **Add the following stores**. Include suitable indexes to keep UI snappy.

```ts
// bibleBee.db.ts (extend existing Dexie instance)
export interface CompetitionYear {
	id: string; // cuid/uuid
	year: number; // e.g., 2025
	name?: string;
	description?: string;
	opensAt?: string; // ISO
	closesAt?: string; // ISO
	createdAt: string;
	updatedAt: string;
}

export interface Scripture {
	id: string;
	competitionYearId: string; // FK -> CompetitionYear.id
	reference: string; // "John 3:16"
	text: string; // scripture content (single translation for demo)
	translation?: string; // "ESV"
	bookLangAlt?: string; // optional bilingual metadata
	sortOrder?: number;
	createdAt: string;
	updatedAt: string;
}

export interface GradeRule {
	id: string;
	competitionYearId: string;
	minGrade: number; // inclusive
	maxGrade: number; // inclusive
	type: 'scripture' | 'essay';
	targetCount?: number; // required when type = 'scripture'
	promptText?: string; // used when type = 'essay'
	instructions?: string; // used when type = 'essay'
	createdAt: string;
	updatedAt: string;
}

export interface StudentScripture {
	id: string;
	childId: string; // FK -> Child.id
	competitionYearId: string; // redundancy for quick filtering
	scriptureId: string; // FK -> Scripture.id
	status: 'assigned' | 'completed';
	completedAt?: string; // ISO
	createdAt: string;
	updatedAt: string;
}

export interface StudentEssay {
	id: string;
	childId: string;
	competitionYearId: string;
	status: 'assigned' | 'submitted';
	submittedAt?: string;
	promptText: string; // snapshot of prompt at assignment time
	instructions?: string; // snapshot
	createdAt: string;
	updatedAt: string;
}

// Dexie stores & indexes
db.version(X).stores({
	competitionYears: 'id, year',
	scriptures: 'id, competitionYearId, sortOrder',
	gradeRules:
		'id, competitionYearId, [competitionYearId+minGrade+maxGrade], type',
	studentScriptures: 'id, childId, competitionYearId, scriptureId, status',
	studentEssays: 'id, childId, competitionYearId, status',
});
```

---

## Assignment & Idempotency (client-only)

Implement reusable helpers to ensure no duplicates and to support re-enrollment safely.

```ts
// helpers/assignments.ts
export async function enrollChildInBibleBee(
	childId: string,
	competitionYearId: string
) {
	// 1) Determine grade rule for child’s current grade (pull child.grade from existing Children table)
	const rule = await getApplicableGradeRule(competitionYearId, childGrade);
	if (!rule) return;

	if (rule.type === 'scripture') {
		// bulk assign all scriptures for the year, idempotent
		const scriptures = await db.scriptures
			.where('competitionYearId')
			.equals(competitionYearId)
			.sortBy('sortOrder');
		const existing = await db.studentScriptures
			.where({ childId, competitionYearId })
			.toArray();
		const existingKeys = new Set(existing.map((s) => s.scriptureId));

		const now = new Date().toISOString();
		const toInsert = scriptures
			.filter((s) => !existingKeys.has(s.id))
			.map((s) => ({
				id: crypto.randomUUID(),
				childId,
				competitionYearId,
				scriptureId: s.id,
				status: 'assigned' as const,
				createdAt: now,
				updatedAt: now,
			}));

		if (toInsert.length) await db.studentScriptures.bulkAdd(toInsert);
	} else {
		// essay flow: ensure exactly one StudentEssay row per child/year
		const existingEssay = await db.studentEssays
			.where({ childId, competitionYearId })
			.first();

		if (!existingEssay) {
			const now = new Date().toISOString();
			await db.studentEssays.add({
				id: crypto.randomUUID(),
				childId,
				competitionYearId,
				status: 'assigned',
				promptText: rule.promptText ?? '',
				instructions: rule.instructions,
				createdAt: now,
				updatedAt: now,
			});
		}
	}
}
```

**Progress check-off (scripture):**

```ts
export async function toggleScriptureCompletion(
	studentScriptureId: string,
	complete: boolean
) {
	const now = new Date().toISOString();
	await db.studentScriptures.update(studentScriptureId, {
		status: complete ? 'completed' : 'assigned',
		completedAt: complete ? now : undefined,
		updatedAt: now,
	});
}
```

**Essay submit:**

```ts
export async function submitEssay(childId: string, competitionYearId: string) {
	const now = new Date().toISOString();
	const essay = await db.studentEssays
		.where({ childId, competitionYearId })
		.first();
	if (!essay) return;
	await db.studentEssays.update(essay.id, {
		status: 'submitted',
		submittedAt: now,
		updatedAt: now,
	});
}
```

---

## CSV Import (browser-only)

- Accept CSV with columns: `reference,text,translation,sortOrder` (plus optional bilingual fields).
- Flow: **Upload → Parse (PapaParse) → Preview Table → Validate** (required fields, no dup references per year) → **Commit** to Dexie under selected competition year.
- On commit, **do not** auto-assign to students (assignment happens on enrollment or manual “re-assign for enrolled” action).

---

## UI Requirements

- **Admin Console**

  - Competition Years: list/create/edit/delete.
  - Scriptures: list/create/edit/delete; CSV import with preview.
  - Grade Rules: create/edit ranges with type `scripture|essay`, targets and prompts.
  - Dashboards: filter by year/grade; show totals: completed vs target, percent complete.

- **Parent / Family Admin**

  - During registration (or child profile), toggle Bible Bee + select competition year.
  - See each child’s assigned verses or essay prompt; can check off scriptures / mark essay submitted.

- **Student**

  - Mobile-first view of assigned scriptures (grouped by year); play-nice list virtualization for long lists.

- **Leader (Bible Bee)**

  - Read-only roster with progress by child for current year.

**UX details**

- Use **optimistic updates** for checkoff; rollback on Dexie failure (rare).
- Cache views with TanStack Query (keyed by competition year and child).
- Keep navigation consistent with your existing Ministries layout.

---

## Seeding (Demo)

- Create 2 competition years (e.g., 2024, 2025).
- Seed \~20 scriptures for each year with sortOrder.
- Create grade rules:

  - Year 2025: `minGrade:1,maxGrade:6,type:'scripture',targetCount:20`
  - Year 2025: `minGrade:7,maxGrade:12,type:'essay',promptText:'Explain…'`

- Seed a few Households/Children; enroll 2–3 kids into Bible Bee 2025 with mixed grades (some scripture, some essay).

---

## Testing (client-only)

- **Assignment idempotency**: enrolling same child/year twice does not create duplicate `StudentScripture` or `StudentEssay`.
- **Grade rule selection**: boundary grades (min/max inclusive) resolve correctly.
- **Progress aggregation**: `completed/target` updates instantly on toggle.
- **CSV validation**: rejects malformed rows, duplicate references (per year), and shows clear errors in preview.
- **UI permissions**: hide admin actions for non-admins; leader read-only.

---

## Deliverables

1. Dexie schema & migration upgrade for new stores.
2. Assignment helpers (`enrollChildInBibleBee`, `toggleScriptureCompletion`, `submitEssay`, `getApplicableGradeRule`).
3. Admin UI (Years, Scriptures, Grade Rules, CSV Import, Dashboards).
4. Parent/Student UI (Enrollment, Assigned List, Check-off/Essay Submit).
5. Seed script to populate demo data.
6. Tests for idempotency, aggregation, and CSV validation.

**Important:** Keep code organized behind the current **DAL abstraction**, even though it’s Dexie-only today. No server calls; everything must work **offline** in demo.

---
