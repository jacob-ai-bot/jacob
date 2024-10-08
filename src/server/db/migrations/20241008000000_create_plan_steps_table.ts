import { sql } from "orchid-orm-schema-to-zod";

export const up = sql`
  CREATE TABLE plan_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    issue_number INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    details TEXT NOT NULL,
    file_path TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

export const down = sql`
  DROP TABLE plan_steps;
`;
