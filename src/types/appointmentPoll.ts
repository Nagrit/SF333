export type PollKind =
  | 'general'
  | 'date'
  | 'time'
  | 'place'
  | 'activity';

export interface PollOption {
  id: string;
  label: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export interface AppointmentPoll {
  id: string;
  title: string;
  kind: PollKind;
  required: boolean;
  options: PollOption[];
}