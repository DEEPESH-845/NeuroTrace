// FHIR R4 resource interfaces (simplified)

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
}

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  name?: Array<{
    family: string;
    given: string[];
  }>;
  gender?: string;
  birthDate?: string;
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
}

export interface FHIRCommunication extends FHIRResource {
  resourceType: 'Communication';
  status: 'preparation' | 'in-progress' | 'completed' | 'on-hold' | 'stopped';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  subject?: {
    reference: string;
  };
  sent?: string;
  received?: string;
  recipient?: Array<{
    reference: string;
  }>;
  payload?: Array<{
    contentString?: string;
  }>;
}

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  type: 'document' | 'message' | 'transaction' | 'collection' | 'searchset';
  entry?: Array<{
    resource: FHIRResource;
  }>;
}

// OAuth 2.0 credentials
export interface OAuth2Credentials {
  clientId: string;
  clientSecret: string;
  scope: string;
  tokenUrl: string;
}

// Access token
export interface AccessToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
}
