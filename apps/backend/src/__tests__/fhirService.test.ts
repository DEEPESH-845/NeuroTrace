/**
 * FHIR Service Tests
 *
 * Tests FHIR resource generation (no DB required).
 */

import {
    createObservationResource,
    createCommunicationResource,
} from '../services/fhirService';

describe('createObservationResource', () => {
    const mockAssessment = {
        id: 'assess-1',
        timestamp: '2025-01-15T10:30:00Z',
        derivedMetrics: {
            speech: { articulationRate: 120 },
            facial: { symmetryScore: 0.85 },
            reaction: { meanReactionTime: 300 },
        },
    };

    it('creates valid FHIR Observation resource', () => {
        const resource = createObservationResource(mockAssessment, 'patient-1');

        expect(resource.resourceType).toBe('Observation');
        expect(resource.id).toBe('assess-1');
        expect(resource.status).toBe('final');
        expect(resource.subject.reference).toBe('Patient/patient-1');
    });

    it('includes speech, facial, and reaction components', () => {
        const resource = createObservationResource(mockAssessment, 'patient-1');

        expect(resource.component).toHaveLength(3);
        expect(resource.component[0].valueQuantity.value).toBe(120);
        expect(resource.component[1].valueQuantity.value).toBe(0.85);
        expect(resource.component[2].valueQuantity.value).toBe(300);
    });

    it('uses LOINC coding system', () => {
        const resource = createObservationResource(mockAssessment, 'patient-1');

        expect(resource.code.coding[0].system).toBe('http://loinc.org');
        for (const comp of resource.component) {
            expect(comp.code.coding[0].system).toBe('http://loinc.org');
        }
    });
});

describe('createCommunicationResource', () => {
    it('creates valid FHIR Communication from active alert', () => {
        const alert = {
            id: 'alert-1',
            patientId: 'patient-1',
            status: 'ACTIVE',
            severity: 'HIGH',
            createdAt: '2025-01-15T10:30:00Z',
            message: 'Critical changes detected',
        };

        const resource = createCommunicationResource(alert);

        expect(resource.resourceType).toBe('Communication');
        expect(resource.status).toBe('in-progress');
        expect(resource.priority).toBe('urgent');
        expect(resource.subject.reference).toBe('Patient/patient-1');
        expect(resource.payload[0].contentString).toBe('Critical changes detected');
    });

    it('sets routine priority for LOW severity', () => {
        const alert = {
            id: 'alert-2',
            patientId: 'patient-1',
            status: 'ACKNOWLEDGED',
            severity: 'LOW',
            createdAt: '2025-01-15T10:30:00Z',
            message: 'Minor changes',
        };

        const resource = createCommunicationResource(alert);
        expect(resource.status).toBe('completed');
        expect(resource.priority).toBe('routine');
    });
});
