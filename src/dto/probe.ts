import { ObjectSchema, InferType, string } from 'yup';

export const ProbeQuerySchema = new ObjectSchema({
  target: string().url().required(),
});

export type ProbeQuery = InferType<typeof ProbeQuerySchema>;
