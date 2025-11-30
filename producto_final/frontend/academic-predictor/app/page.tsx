'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Badge, InputGroup, Spinner, Alert } from 'react-bootstrap';

export default function Home() {
  const router = useRouter();

  // Input States
  const [studentInput, setStudentInput] = useState('');
  const [courseInput, setCourseInput] = useState('');

  // Selection States
  const [confirmedStudent, setConfirmedStudent] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // UI States
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [msg, setMsg] = useState<{type: 'danger' | 'success', text: string} | null>(null);

  // Helper to validate ID via our Next.js API
  const validateId = async (type: 'student' | 'course', id: string) => {
    const res = await fetch(`/api/validate-id?type=${type}&id=${id}`);
    const data = await res.json();
    return data.exists;
  };

  // 1. Handle Student Search
  const handleSearchStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMsg(null);
    
    if (!studentInput.trim()) return;

    setLoadingStudent(true);
    const exists = await validateId('student', studentInput.trim());
    setLoadingStudent(false);

    if (exists) {
      setConfirmedStudent(studentInput.trim());
      setStudentInput(''); // Clear input
      setMsg({ type: 'success', text: 'Estudiante encontrado y seleccionado.' });
    } else {
      setMsg({ type: 'danger', text: `El estudiante ${studentInput} no existe en la base de datos.` });
    }
  };

  // 2. Handle Course Search
  const handleSearchCourse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMsg(null);

    const courseId = courseInput.trim();
    if (!courseId) return;

    // Pre-check: Max 20
    if (selectedCourses.length >= 20) {
      setMsg({ type: 'danger', text: 'Máximo 20 cursos permitidos.' });
      return;
    }
    // Pre-check: Duplicates
    if (selectedCourses.includes(courseId)) {
      setMsg({ type: 'danger', text: 'Este curso ya está en la lista.' });
      return;
    }

    setLoadingCourse(true);
    const exists = await validateId('course', courseId);
    setLoadingCourse(false);

    if (exists) {
      setSelectedCourses([...selectedCourses, courseId]);
      setCourseInput(''); // Clear input
    } else {
      setMsg({ type: 'danger', text: `El curso ${courseId} no existe.` });
    }
  };

  // Remove course
  const removeCourse = (id: string) => {
    setSelectedCourses(selectedCourses.filter(c => c !== id));
  };

  // Submit to next page
  const handleSubmit = () => {
    if (!confirmedStudent || selectedCourses.length === 0) return;
    
    const payload = {
      estudiante_id: confirmedStudent,
      cursos: selectedCourses
    };

    sessionStorage.setItem('predictionPayload', JSON.stringify(payload));
    router.push('/results');
  };

  return (
    <main className="container mt-5" style={{ maxWidth: '800px' }}>
      <div className="text-center mb-5">
        <h1 className="display-5 fw-bold text-primary">Predictor Académico</h1>
        <p className="text-muted">Ingrese códigos exactos para búsqueda rápida</p>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light fw-bold">Configuración de Predicción</Card.Header>
        <Card.Body>
          
          {msg && (
            <Alert variant={msg.type} onClose={() => setMsg(null)} dismissible>
              {msg.text}
            </Alert>
          )}

          {/* --- SECTION 1: STUDENT --- */}
          <div className="mb-5">
            <Form.Label className="fw-bold">1. Seleccionar Estudiante</Form.Label>
            
            {!confirmedStudent ? (
              <Form onSubmit={handleSearchStudent}>
                <InputGroup>
                  <Form.Control
                    placeholder="Ej: EST_00054523"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    disabled={loadingStudent}
                  />
                  <Button variant="primary" type="submit" disabled={loadingStudent}>
                    {loadingStudent ? <Spinner size="sm" animation="border" /> : 'Buscar'}
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">Presione Enter para validar.</Form.Text>
              </Form>
            ) : (
              <div className="d-flex align-items-center p-3 border rounded bg-light-success border-success">
                <div className="flex-grow-1">
                  <strong>Estudiante Seleccionado:</strong> <span className="fs-5 ms-2 badge bg-success">{confirmedStudent}</span>
                </div>
                <Button variant="outline-danger" size="sm" onClick={() => setConfirmedStudent(null)}>
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          <hr />

          {/* --- SECTION 2: COURSES --- */}
          <div className="mb-4">
            <Form.Label className="fw-bold">2. Agregar Cursos a inscribir</Form.Label>
            <Form onSubmit={handleSearchCourse}>
              <InputGroup className="mb-2">
                <Form.Control
                  placeholder="Ej: CRS_00017889"
                  value={courseInput}
                  onChange={(e) => setCourseInput(e.target.value)}
                  disabled={loadingCourse || selectedCourses.length >= 20}
                />
                <Button variant="secondary" type="submit" disabled={loadingCourse || selectedCourses.length >= 20}>
                   {loadingCourse ? <Spinner size="sm" animation="border" /> : 'Agregar'}
                </Button>
              </InputGroup>
            </Form>
            
            {/* List of added courses */}
            <div className="mt-3 p-3 bg-light rounded min-vh-10" style={{ minHeight: '100px' }}>
              {selectedCourses.length === 0 ? (
                <span className="text-muted fst-italic small">No hay cursos agregados aún.</span>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {selectedCourses.map(crs => (
                    <Badge key={crs} bg="success" text="dark" className="p-2 d-flex align-items-center">
                      {crs}
                      <span 
                        className="ms-2 text-danger fw-bold" 
                        style={{cursor: 'pointer'}} 
                        onClick={() => removeCourse(crs)}
                      >
                        &times;
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-end mt-2">
                <small className="text-muted">{selectedCourses.length} / 20 cursos</small>
              </div>
            </div>
          </div>

        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end">
        <Button 
          variant="primary" 
          size="lg" 
          onClick={handleSubmit}
          disabled={!confirmedStudent || selectedCourses.length === 0}
        >
          Analizar Datos &rarr;
        </Button>
      </div>
    </main>
  );
}