// Types for the Employee Aspiration Alignment engine (approved 70:30 model).

export type CategoryLevel = 'High' | 'Medium' | 'Low';
export type CategoryPoint = 1 | 2 | 3;

export interface ApprovedCategory {
  no: number;
  name: string;
  classification: CategoryLevel;
  point: CategoryPoint;
}

export type AlignmentClass = 'HIGH ALIGNMENT' | 'MEDIUM ALIGNMENT' | 'LOW ALIGNMENT';
export type AlignmentStatus = AlignmentClass | 'INCOMPLETE DATA' | 'NO ASPIRATION DATA' | 'UNMAPPED CATEGORY';

export interface AlignmentResult {
  shortTermPoint: CategoryPoint;
  longTermPoint: CategoryPoint;
  shortTermWeightedPoint: number;
  longTermWeightedPoint: number;
  totalWeightedPoint: number;
  /** Unrounded score in percent (33.333… – 100). Classification always uses this value. */
  rawAlignmentScore: number;
  /** One decimal place, e.g. "90.0%". */
  displayAlignmentScore: string;
  alignmentClassification: AlignmentClass;
}

export type AspirationSide = { original: string; status: 'valid' | 'missing' | 'unmapped'; category: ApprovedCategory | null };

export interface EmployeeAlignment {
  shortTerm: AspirationSide;
  longTerm: AspirationSide;
  status: AlignmentStatus;
  /** 'Scored' | 'Incomplete data' | 'No aspiration data' | 'Unmapped category' */
  validation: string;
  result: AlignmentResult | null;
}
