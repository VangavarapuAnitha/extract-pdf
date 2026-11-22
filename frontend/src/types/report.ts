
export interface Report {
  id: number;
  reportId: string | null;
  sampleId: string | null;
  originalFilename: string;
  status: string;
  createdAt: string;
}

export interface ReportParameter {
  id: number;
  parameterName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  displayOrder: number;
  pageNumber: number | null;
}

export interface ReportDetails extends Report {
  parameters: ReportParameter[];
}
