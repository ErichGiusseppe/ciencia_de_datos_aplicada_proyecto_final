'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Badge, InputGroup, Spinner, Alert, ListGroup } from 'react-bootstrap';

interface CourseWithCredits {
  code: string;
  credits: number;
}

export default function Home() {
  const router = useRouter();

  // Input States
  const [studentInput, setStudentInput] = useState('');
  const [courseInput, setCourseInput] = useState('');
  const [maxCreditsInput, setMaxCreditsInput] = useState('20');
  const [maxCredits, setMaxCredits] = useState<number | null>(null);

  // Autocomplete States
  const [studentSuggestions, setStudentSuggestions] = useState<string[]>([]);
  const [courseSuggestions, setCourseSuggestions] = useState<string[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  // Selection States
  const [confirmedStudent, setConfirmedStudent] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<CourseWithCredits[]>([]);

  // UI States
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [msg, setMsg] = useState<{type: 'danger' | 'success', text: string} | null>(null);

  // Refs for detecting clicks outside
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Calculate total credits
  const totalCredits = selectedCourses.reduce((sum, course) => sum + course.credits, 0);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setShowStudentDropdown(false);
      }
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setShowCourseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for student IDs
  useEffect(() => {
    const searchStudents = async () => {
      if (studentInput.length < 3) {
        setStudentSuggestions([]);
        setShowStudentDropdown(false);
        return;
      }

      const res = await fetch(`/api/search-id?type=student&query=${encodeURIComponent(studentInput)}&limit=10`);
      const data = await res.json();
      setStudentSuggestions(data.results || []);
      setShowStudentDropdown(data.results?.length > 0);
    };

    const debounceTimer = setTimeout(searchStudents, 300);
    return () => clearTimeout(debounceTimer);
  }, [studentInput]);

  // Search for course IDs
  useEffect(() => {
    const searchCourses = async () => {
      if (courseInput.length < 3) {
        setCourseSuggestions([]);
        setShowCourseDropdown(false);
        return;
      }

      const res = await fetch(`/api/search-id?type=course&query=${encodeURIComponent(courseInput)}&limit=10`);
      const data = await res.json();
      setCourseSuggestions(data.results || []);
      setShowCourseDropdown(data.results?.length > 0);
    };

    const debounceTimer = setTimeout(searchCourses, 300);
    return () => clearTimeout(debounceTimer);
  }, [courseInput]);

  // Helper to validate ID via our Next.js API
  const validateId = async (type: 'student' | 'course', id: string) => {
    const res = await fetch(`/api/validate-id?type=${type}&id=${id}`);
    const data = await res.json();
    return data;
  };

  // 1. Handle Student Search
  const handleSearchStudent = async (studentId?: string) => {
    setMsg(null);
    
    const idToSearch = studentId || studentInput.trim();
    if (!idToSearch) return;

    setLoadingStudent(true);
    const { exists } = await validateId('student', idToSearch);
    setLoadingStudent(false);

    if (exists) {
      setConfirmedStudent(idToSearch);
      setStudentInput(''); // Clear input
      setShowStudentDropdown(false);
      setMsg({ type: 'success', text: 'Estudiante encontrado y seleccionado.' });
    } else {
      setMsg({ type: 'danger', text: `El estudiante ${idToSearch} no existe en la base de datos.` });
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchStudent();
  };

  // 2. Handle Max Credits
  const handleMaxCredits = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMsg(null);
    
    const credits = parseInt(maxCreditsInput);
    
    if (isNaN(credits) || credits <= 0) {
      setMsg({ type: 'danger', text: 'Por favor ingrese un número válido mayor a 0.' });
      return;
    }
    
    if (credits > 30) {
      setMsg({ type: 'danger', text: 'El máximo de créditos no puede ser mayor a 30.' });
      return;
    }

    setMaxCredits(credits);
    setMsg({ type: 'success', text: `Máximo de créditos configurado: ${credits}` });
  };

  // 3. Handle Course Search
  const handleSearchCourse = async (courseId?: string) => {
    setMsg(null);

    const idToSearch = courseId || courseInput.trim();
    if (!idToSearch) return;

    // Pre-check: Duplicates
    if (selectedCourses.some(c => c.code === idToSearch)) {
      setMsg({ type: 'danger', text: 'Este curso ya está en la lista.' });
      return;
    }

    setLoadingCourse(true);
    const { exists, credits } = await validateId('course', idToSearch);
    setLoadingCourse(false);

    if (exists) {
      const creditsLimit = maxCredits || 20;
      if (totalCredits + credits > creditsLimit) {
        setMsg({ type: 'danger', text: `No se puede agregar. Excedería el máximo de ${creditsLimit} créditos (actual: ${totalCredits}, nuevo: ${totalCredits + credits}).` });
        return;
      }

      setSelectedCourses([...selectedCourses, { code: idToSearch, credits }]);
      setCourseInput('');
      setShowCourseDropdown(false);
    } else {
      setMsg({ type: 'danger', text: `El curso ${idToSearch} no existe.` });
    }
  };

  const handleCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchCourse();
  };

  // Remove course
  const removeCourse = (code: string) => {
    setSelectedCourses(selectedCourses.filter(c => c.code !== code));
  };

  // Submit to next page
  const handleSubmit = () => {
    if (!confirmedStudent || selectedCourses.length === 0) return;
    
    const payload = {
      estudiante_id: confirmedStudent,
      cursos: selectedCourses.map(c => c.code)
    };

    sessionStorage.setItem('predictionPayload', JSON.stringify(payload));
    router.push('/results');
  };

  const creditsLimit = maxCredits || 20;

  return (
    <main className="container mt-5" style={{ maxWidth: '800px' }}>
      <div className="text-center mb-5">
        <h1 className="display-5 fw-bold text-primary">Predictor académico</h1>
        <p className="text-muted">Ingrese códigos exactos para búsqueda rápida</p>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light fw-bold">Configuración de predicción</Card.Header>
        <Card.Body>
          
          {msg && (
            <Alert variant={msg.type} onClose={() => setMsg(null)} dismissible>
              {msg.text}
            </Alert>
          )}

          {/* --- SECTION 1: STUDENT --- */}
          <div className="mb-5">
            <Form.Label className="fw-bold">1. Seleccionar estudiante</Form.Label>
            
            {!confirmedStudent ? (
              <div ref={studentDropdownRef} style={{ position: 'relative' }}>
                <Form onSubmit={handleStudentSubmit}>
                  <InputGroup>
                    <Form.Control
                      placeholder="Ej: EST_00054523"
                      value={studentInput}
                      onChange={(e) => setStudentInput(e.target.value)}
                      disabled={loadingStudent}
                      autoComplete="off"
                    />
                    <Button variant="primary" type="submit" disabled={loadingStudent}>
                      {loadingStudent ? <Spinner size="sm" animation="border" /> : 'Buscar'}
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">Presione Enter para validar o seleccione de la lista.</Form.Text>
                </Form>
                
                {showStudentDropdown && studentSuggestions.length > 0 && (
                  <ListGroup style={{ position: 'absolute', zIndex: 1000, width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
                    {studentSuggestions.map((id) => (
                      <ListGroup.Item 
                        key={id} 
                        action 
                        onClick={() => {
                          setStudentInput(id);
                          handleSearchStudent(id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {id}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            ) : (
              <div className="d-flex align-items-center p-3 border rounded bg-light-success border-success">
                <div className="flex-grow-1">
                  <strong>Estudiante seleccionado:</strong> <span className="fs-5 ms-2 badge bg-success">{confirmedStudent}</span>
                </div>
                <Button variant="outline-danger" size="sm" onClick={() => setConfirmedStudent(null)}>
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          <hr />
          
          {/* --- SECTION 2: MAX CREDITS --- */}
          <div className="mb-5">
            <Form.Label className="fw-bold">2. Indicar máximo de créditos</Form.Label>
            
            {maxCredits === null ? (
              <Form onSubmit={handleMaxCredits}>
                <InputGroup>
                  <Form.Control
                    type="number"
                    placeholder="Ej: 20"
                    value={maxCreditsInput}
                    onChange={(e) => setMaxCreditsInput(e.target.value)}
                    min="1"
                    max="30"
                  />
                  <Button variant="primary" type="submit">
                    Confirmar
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">Ingrese un número entre 1 y 30.</Form.Text>
              </Form>
            ) : (
              <div className="d-flex align-items-center p-3 border rounded bg-light-info border-info">
                <div className="flex-grow-1">
                  <strong>Créditos máximos:</strong> <span className="fs-5 ms-2 badge bg-info">{maxCredits}</span>
                </div>
                <Button variant="outline-danger" size="sm" onClick={() => {
                  setMaxCredits(null);
                  setSelectedCourses([]);
                }}>
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          <hr />

          {/* --- SECTION 3: COURSES --- */}
          <div className="mb-4">
            <Form.Label className="fw-bold">3. Agregar cursos a inscribir</Form.Label>
            <div ref={courseDropdownRef} style={{ position: 'relative' }}>
              <Form onSubmit={handleCourseSubmit}>
                <InputGroup className="mb-2">
                  <Form.Control
                    placeholder="Ej: CRS_00017889"
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value)}
                    disabled={loadingCourse || totalCredits >= creditsLimit}
                    autoComplete="off"
                  />
                  <Button variant="secondary" type="submit" disabled={loadingCourse || totalCredits >= creditsLimit}>
                     {loadingCourse ? <Spinner size="sm" animation="border" /> : 'Agregar'}
                  </Button>
                </InputGroup>
              </Form>
              
              {showCourseDropdown && courseSuggestions.length > 0 && (
                <ListGroup style={{ position: 'absolute', zIndex: 1000, width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
                  {courseSuggestions.map((id) => (
                    <ListGroup.Item 
                      key={id} 
                      action 
                      onClick={() => {
                        setCourseInput(id);
                        handleSearchCourse(id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {id}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
            
            {/* List of added courses */}
            <div className="mt-3 p-3 bg-light rounded min-vh-10" style={{ minHeight: '100px' }}>
              {selectedCourses.length === 0 ? (
                <span className="text-muted fst-italic small">No hay cursos agregados aún.</span>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {selectedCourses.map(course => (
                    <Badge key={course.code} bg="success" className="p-2 d-flex align-items-center">
                      <span>{course.code} ({course.credits} créditos)</span>
                      <span 
                        className="ms-2 text-danger fw-bold" 
                        style={{cursor: 'pointer'}} 
                        onClick={() => removeCourse(course.code)}
                      >
                        &times;
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-end mt-2">
                <small className="text-muted">
                  <strong>{totalCredits} / {creditsLimit} créditos</strong> ({selectedCourses.length} cursos)
                </small>
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
          Analizar datos &rarr;
        </Button>
      </div>
    </main>
  );
}