const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export type EntranceLog = { at: number; exit: boolean; accepted: boolean };
export type StudentReport = {
	reason: string;
	at: number;
	reported_by: string;
	due_date: number;
	suspended: boolean;
};
export type Student = {
	id: string;
	name: string;
	prev_semester?: string | null;
	semester?: string | null;
	gender?: string | null;
	age?: string | null;
	shift?: string | null;
	prev_group?: string | null;
	group?: string | null;
	logs: EntranceLog[];
	reports?: StudentReport[];
};

const getCount = async (schoolId: string, path: string): Promise<number> => {
	if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");

	const response = await fetch(`${apiBaseUrl}/students/${encodeURIComponent(schoolId)}${path}`);
	const body = await response.text();
	if (!response.ok) throw new Error(`Request failed: ${response.status}`);

	const value = Number(body.trim().replace(/^"|"$/g, ""));
	if (!Number.isFinite(value)) throw new Error(`Invalid count response: ${body}`);
	return value;
};

export const getStudentCounts = async (schoolId: string) => {
	const [inside, total, newCount, outside] = await Promise.all([
		getCount(schoolId, "/countCurrentlyInside"),
		getCount(schoolId, "/countTotalStudents"),
		getCount(schoolId, "/countNewStudents"),
		getCount(schoolId, "/countCurrentlyOutside"),
	]);

	return { inside, total, newCount, outside };
};

export const getFilteredStudents = async (filters: {
	schoolId: string;
	name?: string | null;
	id?: string | null;
	group?: string | null;
	semester?: string | null;
	career?: string | null;
	shift?: string | null;
}): Promise<Student[]> => {
	if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");

	const query = `
	    query StudentsFilter($schoolId: String!, $name: String, $id: String, $group: String, $semester: String, $career: String, $shift: String) {
		studentsFilter(schoolId: $schoolId, name: $name, id: $id, group: $group, semester: $semester, career: $career, shift: $shift) {
        id
				name
				prev_semester
				semester
				gender
				age
				shift
				prev_group
				group
        logs { at exit accepted }
      }
    }
  `;

	const response = await fetch(`${apiBaseUrl}/graphql`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			query,
			variables: {
				schoolId: filters.schoolId,
				name: filters.name ?? null,
				id: filters.id ?? null,
				group: filters.group ?? null,
				semester: filters.semester ?? null,
				career: filters.career ?? null,
				shift: filters.shift ?? null,
			},
		}),
	});

	const payload: {
		data?: { studentsFilter?: Student[] };
		errors?: { message?: string }[];
	} = await response.json();
	if (!response.ok) throw new Error(`GraphQL request failed: ${response.status}`);
	if (payload.errors?.length) {
		throw new Error(payload.errors.map((error) => error.message).filter(Boolean).join(" | ") || "GraphQL error");
	}

	return payload.data?.studentsFilter ?? [];
};

export const getStudentDetail = async (schoolId: string, id: string): Promise<Student> => {
	if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");

	const query = `
	query Student($schoolId: String!, $id: String!) {
	student(schoolId: $schoolId, id: $id) {
        id
        name
        career
        prev_semester
        semester
        gender
        age
        shift
        prev_group
        group
        logs { at exit accepted }
        reports { reason at reported_by due_date suspended }
      }
    }
  `;

	const response = await fetch(`${apiBaseUrl}/graphql`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ query, variables: { schoolId, id } }),
	});
	const payload: {
		data?: { student?: Student | null };
		errors?: { message?: string }[];
	} = await response.json();
	if (!response.ok) throw new Error(`GraphQL request failed: ${response.status}`);
	if (payload.errors?.length) {
		throw new Error(payload.errors.map((error) => error.message).filter(Boolean).join(" | ") || "GraphQL error");
	}
	if (!payload.data?.student) throw new Error("Student not found");
	return payload.data.student;
};

const sendReportRequest = async (schoolId: string, path: string, body: Record<string, unknown>) => {
	if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");
	const response = await fetch(`${apiBaseUrl}/students/${encodeURIComponent(schoolId)}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok) throw new Error(`Report request failed: ${response.status}`);
};

export const createStudentReport = (schoolId: string, id: string, report: StudentReport) =>
	sendReportRequest(schoolId, "/addReport", { id, report });

export const updateStudentReport = (schoolId: string, id: string, at: number, report: StudentReport) =>
	sendReportRequest(schoolId, "/updateReport", { id, at, report });

export const deleteStudentReport = (schoolId: string, id: string, at: number) =>
	sendReportRequest(schoolId, "/deleteReport", { id, at });

export type ImportSummary = {
	inserted?: number;
	updated?: number;
	deleted?: number;
	totalIncoming?: number;
};

export const importStudents = async (schoolId: string, file: File, mode: "new" | "update"): Promise<ImportSummary> => {
	if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");
	const form = new FormData();
	form.append("file", file, file.name);
	const response = await fetch(`${apiBaseUrl}/students/${encodeURIComponent(schoolId)}/import/${mode}`, { method: "POST", body: form });
	const payload = await response.json();
	if (!response.ok) throw new Error(payload?.detail || `Import failed: ${response.status}`);
	return payload;
};
