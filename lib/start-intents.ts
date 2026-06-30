export type StartIntentField = {
  label: string;
  value: string;
};

export type StartIntent = {
  id: string;
  ownerId?: string;
  source: string;
  selectedDestination?: string;
  destination: string;
  modeChanged: boolean;
  routeReason: string;
  prompt: string;
  fields: StartIntentField[];
  guardrail: string;
  href: string;
  createdAt: string;
};

export type CreateStartIntentInput = Omit<StartIntent, "id" | "ownerId" | "createdAt">;
