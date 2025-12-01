'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Spinner, Alert, ProgressBar, Badge, Row, Col, Modal } from 'react-bootstrap';
import { BsLightbulb } from 'react-icons/bs';
import * as d3 from 'd3';

// Interface matching your API response
interface PredictionResponse {
  nivel_usado: string;
  razon: string;
  probabilidad_exito: number;
  cluster_id: number;
  num_estudiantes_similares: number;
  confianza: string;
  total_clusters: number;
  histogram_gpa: number[];
  histogram_total_semesters: number[];
  histogram_percentage_credits: number[];
  gpa_range: { min: number; max: number };
  semesters_range: { min: number; max: number };
  credits_range: { min: number; max: number };
  student_gpa: number | null;
  student_total_semesters: number | null;
  student_percentage_credits: number | null;
}

export default function Results() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState('');
  const [requestData, setRequestData] = useState<{ estudiante_id: string, cursos: string[], creditos: number } | null>(null);
  const [showNivelModal, setShowNivelModal] = useState(false);
  const [showRazonModal, setShowRazonModal] = useState(false);
  const [showConfianzaModal, setShowConfianzaModal] = useState(false);

  // Refs for D3 charts
  const gpaChartRef = useRef<HTMLDivElement>(null);
  const semestersChartRef = useRef<HTMLDivElement>(null);
  const creditsChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Retrieve data from previous page
      const storedData = sessionStorage.getItem('predictionPayload');
      
      if (!storedData) {
        router.push('/');
        return;
      }

      const payload = JSON.parse(storedData);
      setRequestData(payload);

      try {
        // Call your local FastAPI
        const response = await fetch('http://localhost:8000/predecir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Error en la respuesta del servidor');
        }

        const data: PredictionResponse = await response.json();
        setResult(data);
        console.log('Prediction result:', data);
      } catch (err) {
        console.error(err);
        setError('No se pudo conectar con el modelo de predicción. Asegúrate de que el API esté corriendo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Draw D3 charts when result is available
    useEffect(() => {
    if (result && result.histogram_gpa && result.histogram_total_semesters && result.histogram_percentage_credits) {
      console.log(result.student_gpa);
      console.log(result.student_percentage_credits);
      console.log(result.student_total_semesters);
      drawChart(gpaChartRef.current, result.histogram_gpa, 'Distribución de GPA', 'blue', 'Valor de GPA ', result.gpa_range, result.student_gpa);
      drawChart(semestersChartRef.current, result.histogram_total_semesters, 'Distribución de semestres totales', 'green', 'Semestres', result.semesters_range, result.student_total_semesters);
      drawChart(creditsChartRef.current, result.histogram_percentage_credits, 'Distribución de porcentaje de créditos aprobados', 'red', 'Porcentaje', result.credits_range, result.student_percentage_credits);
    }
  }, [result]);

  const drawChart = (
    container: HTMLDivElement | null, 
    data: number[], 
    title: string, 
    color: string, 
    xLabel: string, 
    valueRange: { min: number; max: number },
    studentValue: number | null
  ) => {
    if (!container) return;

    // Clear previous chart
    d3.select(container).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales - now with actual value range
    const xScale = d3.scaleLinear()
      .domain([valueRange.min, valueRange.max])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data) || 1])
      .range([height, 0]);

    // Create line generator - map indices to actual values
    const line = d3.line<number>()
      .x((d, i) => {
        const actualValue = valueRange.min + (i / (data.length - 1)) * (valueRange.max - valueRange.min);
        return xScale(actualValue);
      })
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    // Add X axis with actual values
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text(xLabel);

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('Density');

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
      );

    // Add line path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add vertical dotted line for student value if it exists
    if (studentValue !== null && studentValue !== undefined) {
      const xPosition = xScale(studentValue);
      
      // Add the dotted line
      svg.append('line')
        .attr('x1', xPosition)
        .attr('x2', xPosition)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7);
      
      // Add label for the student value
      svg.append('text')
        .attr('x', xPosition)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', 'black')
        .text(`Tu valor: ${studentValue.toFixed(2)}`);
    }

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(title);
  };

  // Helper for probability color
  const getVariant = (prob: number) => {
    if (prob >= 0.8) return 'success';
    if (prob >= 0.5) return 'warning';
    return 'danger';
  };

  // Get nivel explanation
  const getNivelExplanation = (nivel: string) => {
    const upperNivel = nivel.toUpperCase();
    
    if (upperNivel.includes('NIVEL_1')) {
      return {
        title: 'Nivel 1: Análisis por cantidad de cursos',
        points: [
          'Solo mira cuántos cursos quieres tomar en total',
          'Ejemplo: Si quieres tomar 4 cursos, busca a todos los que tomaron 4 cursos, sin importar cuáles',
          'Se usa si no hay suficientes datos en los otros niveles (requiere al menos 5 casos)'
        ]
      };
    } else if (upperNivel.includes('NIVEL_2')) {
      return {
        title: 'Nivel 2: Análisis por áreas temáticas',
        points: [
          'Busca estudiantes que tomaron cursos de las mismas áreas temáticas',
          'Ejemplo: Si quieres tomar 2 cursos de ingeniería y 1 de ciencias, busca a quienes tomaron esa proporción',
          'Solo se usa si hay al menos 10 estudiantes similares'
        ]
      };
    } else if (upperNivel.includes('NIVEL_3')) {
      return {
        title: 'Nivel 3: Análisis por cursos específicos',
        points: [
          'Busca estudiantes que tomaron exactamente los mismos cursos',
          'Ejemplo: Si quieres tomar Cálculo I, Física I y Programación I, busca a quienes tomaron esos 3 cursos específicos',
          'Solo se usa si hay al menos 20 estudiantes con esa combinación exacta'
        ]
      };
    } else {
      return {
        title: 'No info',
        points: ['No hay información disponible para este nivel.']
      };
    }
  };

  // Get razon explanation
  const getRazonExplanation = (razon: string, nivel: string) => {
    const upperRazon = razon.toUpperCase();
    const upperNivel = nivel.toUpperCase();

    if (upperRazon.includes('MAINSTREAM') && upperNivel.includes('NIVEL_3')) {
      return {
        title: 'NIVEL 3 - Estudiante MAINSTREAM (Confiable)',
        points: [
          'Hay muchos casos exactamente iguales al tuyo',
          'La predicción es muy precisa',
          'Ejemplo: "Encontramos 87 estudiantes que tomaron exactamente tus mismos cursos"'
        ]
      };
    } else if (upperRazon.includes('MAINSTREAM') && upperNivel.includes('NIVEL_2')) {
      return {
        title: 'NIVEL 2 - Estudiante MAINSTREAM (Moderadamente confiable)',
        points: [
          'No hay suficientes casos exactos, pero sí casos parecidos',
          'La predicción es buena pero menos precisa',
          'Ejemplo: "Encontramos 45 estudiantes que tomaron cursos de las mismas categorías"'
        ]
      };
    } else if ((upperRazon.includes('MAINSTREAM') || upperRazon.includes('OUTLIER')) && upperNivel.includes('NIVEL_1')) {
      return {
        title: 'NIVEL 1 - Estudiante MAINSTREAM o OUTLIER (Menos confiable)',
        points: [
          'Combinación poco común, solo sabemos cuántos cursos tomas',
          'La predicción es general',
          'Ejemplo: "Encontramos 120 estudiantes que tomaron 4 cursos como tú"'
        ]
      };
    } else if (upperRazon.includes('OUTLIER')) {
      return {
        title: 'Estudiante OUTLIER (Advertencia)',
        points: [
          'Tu combinación es única o muy rara',
          'No hay suficientes datos históricos',
          'Usamos una probabilidad general (93.77% - el promedio de todos)'
        ]
      };
    } else {
      return {
        title: 'No info',
        points: ['No hay información específica disponible para esta razón.']
      };
    }
  };

  // Get confianza explanation
  const getConfianzaExplanation = (confianza: string) => {
    const upperConfianza = confianza.toUpperCase();

    if (upperConfianza.includes('ALTA')) {
      return {
        title: 'ALTA - 50 o más estudiantes similares',
        points: [
          'Puedes confiar mucho en esta predicción',
          'Hay muchos casos históricos iguales al tuyo'
        ]
      };
    } else if (upperConfianza.includes('MEDIA')) {
      return {
        title: 'MEDIA - Entre 20 y 49 estudiantes similares',
        points: [
          'La predicción es razonable',
          'Hay bastantes casos similares'
        ]
      };
    } else if (upperConfianza.includes('BAJA')) {
      return {
        title: 'BAJA - Menos de 20 estudiantes similares',
        points: [
          'Toma esta predicción con cautela',
          'Pocos casos históricos para comparar'
        ]
      };
    } else {
      return {
        title: 'No info',
        points: ['No hay información disponible para este nivel de confianza.']
      };
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Procesando datos con el modelo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Ocurrió un error</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button onClick={() => router.push('/')} variant="outline-danger">
              Volver al inicio
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const nivelInfo = result ? getNivelExplanation(result.nivel_usado) : null;
  const razonInfo = result ? getRazonExplanation(result.razon, result.nivel_usado) : null;
  const confianzaInfo = result ? getConfianzaExplanation(result.confianza) : null;

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="outline-secondary" onClick={() => router.push('/')}>
          &larr; Volver a la búsqueda
        </Button>
        
        <div className="d-flex align-items-center gap-2 text-muted">
          <BsLightbulb size={20} />
          <small className="fst-italic">De click en este ícono para más información de cada indicador</small>
        </div>
      </div>

      <h2 className="mb-4 text-center fw-bold">Resultados del análisis</h2>

      {result && (
        <Row>
            {/* Main Probability Card */}
            <Col md={12} className="mb-4">
                <Card className={`text-center border-${getVariant(result.probabilidad_exito)} shadow`}>
                    <Card.Header as="h5">Probabilidad de éxito académico</Card.Header>
                    <Card.Body className="py-5">
                        <h1 className={`display-1 fw-bold text-${getVariant(result.probabilidad_exito)}`}>
                            {(result.probabilidad_exito * 100).toFixed(1)}%
                        </h1>
                        <div className="w-50 mx-auto mt-3">
                            <ProgressBar 
                                now={result.probabilidad_exito * 100} 
                                variant={getVariant(result.probabilidad_exito)} 
                                style={{ height: '10px' }}
                            />
                        </div>
                        <Card.Text className="mt-3 text-muted">
                            Para el estudiante <strong>{requestData?.estudiante_id}</strong> inscribiendo {requestData?.cursos.length} cursos para un total de {requestData?.creditos} créditos.
                        </Card.Text>
                    </Card.Body>
                </Card>
            </Col>

            {/* Details Card */}
            <Col md={12} className="mb-4">
                <Card className="h-100 shadow-sm">
                    <Card.Header className="fw-bold bg-light">Detalles del clustering</Card.Header>
                    <Card.Body>
                        <ul className="list-group list-group-flush">
                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                Estudiantes similares dentro del cluster
                                <span className="fw-bold">{result.num_estudiantes_similares}</span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <span>Nivel de análisis</span>
                                    <span 
                                      className="text-primary d-inline-flex align-items-center" 
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => setShowNivelModal(true)}
                                    >
                                      <BsLightbulb size={20} />
                                    </span>
                                </div>
                                <span className="text-end text-muted">{result.nivel_usado}</span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-2">
                                <span>Confianza del modelo:</span>
                                <span 
                                  className="text-primary d-inline-flex align-items-center" 
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => setShowConfianzaModal(true)}
                                >
                                  <BsLightbulb size={20} />
                                </span>
                              </div>
                              <span className="fw-bold">{result.confianza}</span>
                            </li>
                        </ul>
                    </Card.Body>
                </Card>
            </Col>

            {/* Distribution Charts */}
             <Col md={12} className="mb-4">
                <Card className="shadow-sm">
                    <Card.Header className="fw-bold bg-light">Distribuciones del Cluster</Card.Header>
                    <Card.Body>
                        <Row>
                            <Col md={12} className="mb-4">
                                <div ref={gpaChartRef} style={{ width: '100%' }}></div>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12} className="mb-4">
                                <div ref={semestersChartRef} style={{ width: '100%' }}></div>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12} className="mb-3">
                                <div ref={creditsChartRef} style={{ width: '100%' }}></div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Col>


        </Row>
      )}

      {/* Modal for Nivel Information */}
      <Modal show={showNivelModal} onHide={() => setShowNivelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{nivelInfo?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul>
            {nivelInfo?.points.map((point, index) => (
              <li key={index} className="mb-2">{point}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNivelModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal for Razon Information */}
      <Modal show={showRazonModal} onHide={() => setShowRazonModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{razonInfo?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul>
            {razonInfo?.points.map((point, index) => (
              <li key={index} className="mb-2">{point}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRazonModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal for Confianza Information */}
      <Modal show={showConfianzaModal} onHide={() => setShowConfianzaModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{confianzaInfo?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul>
            {confianzaInfo?.points.map((point, index) => (
              <li key={index} className="mb-2">{point}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfianzaModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}