export const TEAM_ROLES = [
  {
    value: 'Graduate Research Assistant',
    hint: 'For graduate M.S. thesis students (both old and new) who have received explicit approval from the Principal Investigator (QRN Sir).',
  },
  {
    value: 'M.S. Thesis Student',
    hint: 'For graduate M.S. thesis students who have not yet received explicit approval from the Principal Investigator for the Graduate Research Assistant role.',
  },
  {
    value: 'Undergraduate Research Assistant',
    hint: 'For 3rd and 4th-year undergraduate students who have received explicit approval from the Principal Investigator.',
  },
  {
    value: 'Student Researcher',
    hint: 'For 3rd and 4th-year undergraduate students who have not yet received explicit approval from the Principal Investigator for the Assistant role.',
  },
  {
    value: 'Research Intern',
    hint: 'For students who are just starting out and have actively worked with us for at least 3 months.',
  },
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number]['value'];
