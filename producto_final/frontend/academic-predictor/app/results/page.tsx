'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Spinner, Alert, ProgressBar, Badge, Row, Col } from 'react-bootstrap';

// Interface matching your API response
interface PredictionResponse {
  nivel_usado: string;
  razon: string;
  probabilidad_exito: number;
  cluster_id: number;
  num_estudiantes_similares: number;
  confianza: number; // Assuming float between 0 and 1
  total_clusters: number;
}

export default function Results() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState('');
  const [requestData, setRequestData] = useState<{ estudiante_id: string, cursos: string[] } | null>(null);

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

  // Helper for probability color
  const getVariant = (prob: number) => {
    if (prob >= 0.8) return 'success';
    if (prob >= 0.5) return 'warning';
    return 'danger';
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

  return (
    <div className="mt-4">
      <Button variant="outline-secondary" className="mb-4" onClick={() => router.push('/')}>
        &larr; Volver a la búsqueda
      </Button>

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
                            Para el estudiante <strong>{requestData?.estudiante_id}</strong> inscribiendo {requestData?.cursos.length} cursos.
                        </Card.Text>
                    </Card.Body>
                </Card>
            </Col>

            {/* Details Card */}
            <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                    <Card.Header className="fw-bold bg-light">Detalles del clustering</Card.Header>
                    <Card.Body>
                        <ul className="list-group list-group-flush">
                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                Cluster asignado (id)
                                <Badge bg="info" pill> {result.cluster_id}</Badge>
                            </li>
                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                Estudiantes similares
                                <span className="fw-bold">{result.num_estudiantes_similares}</span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between align-items-center">
                                Nivel de análisis
                                <span className="text-end text-muted">{result.nivel_usado}</span>
                            </li>
                        </ul>
                    </Card.Body>
                </Card>
            </Col>

             {/* Context Card */}
             <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                    <Card.Header className="fw-bold bg-light">Análisis del modelo</Card.Header>
                    <Card.Body>
                        <Card.Title>Razón del resultado</Card.Title>
                        <Card.Text>
                            {result.razon}
                        </Card.Text>
                        <hr />
                        <div className="d-flex justify-content-between align-items-center">
                            <span>Confianza del modelo: (alto es 50 o más, medio entre 20 y 49, bajo menos de 20) </span>
                            <div className="d-flex align-items-center gap-2">
                                <span>{result.confianza}</span>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
      )}
    </div>
  );
}