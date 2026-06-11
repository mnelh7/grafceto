export interface Example {
  id: string;
  title: string;
  description: string;
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'hand-dryer',
    title: 'Electric Hand Dryer',
    description:
      'When the sensor detects hands, the blower runs for 15 seconds, then stops automatically.',
    code: `grafcet "Electric Hand Dryer" {
  initial step S0 "Idle" {
    action "Wait for hands"
  }

  transition T1 from S0 to S1 when "B1 = 1"

  step S1 "Drying" {
    action "M1 := ON"
    action "Timer T15 start"
  }

  transition T2 from S1 to S2 when "T15 done"

  step S2 "Stop Blower" {
    action "M1 := OFF"
  }

  transition T3 from S2 to S0 when "1"
}`,
  },
  {
    id: 'conveyor',
    title: 'Conveyor Belt',
    description:
      'A simple conveyor that starts when the guard is closed and a start signal is given, and stops on demand or guard open.',
    code: `grafcet "Conveyor Belt" {
  initial S0: "Stopped" / "M1 := OFF"
  T1: S0 -> S1 when "Start AND GuardClosed"
  S1: "Running" / "M1 := ON"
  T2: S1 -> S0 when "Stop OR NOT GuardClosed"
}`,
  },
  {
    id: 'two-hand',
    title: 'Two Hand Control',
    description:
      'A safety circuit requiring both left and right hand buttons to be pressed simultaneously before enabling the machine cycle.',
    code: `grafcet "Two Hand Control" {
  initial S0: "Ready"

  T1: S0 -> [S1, S2] when "Start"

  S1: "Left channel active" / "K1 := ON"
  S2: "Right channel active" / "K2 := ON"

  T2: [S1, S2] -> S3 when "Both channels OK"

  S3: "Cycle enabled" / "Enable := TRUE"
  T3: S3 -> S0 when "Reset"
}`,
  },
];

export const DEFAULT_EXAMPLE = EXAMPLES[0];
