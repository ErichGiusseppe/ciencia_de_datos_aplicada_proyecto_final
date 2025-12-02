import studentIds from '@/public/data/codigos_estudiantes.json';
import courseIds from '@/public/data/codigos_cursos.json';
import courseCredits from '@/public/data/codigos_cursos_creditos.json';

export function searchIds(type: 'student' | 'course', query: string, limit: number = 10): string[] {
  const data = type === 'student' ? studentIds : courseIds;
  const filtered = data.filter((id: string) => 
    id.toLowerCase().includes(query.toLowerCase())
  );
  return filtered.slice(0, limit);
}

export function checkIdExists(type: 'student' | 'course', id: string): boolean {
  const data = type === 'student' ? studentIds : courseIds;
  return data.includes(id);
}

export function getCourseCredits(courseId: string): number | null {
  return courseCredits[courseId as keyof typeof courseCredits] || null;
}