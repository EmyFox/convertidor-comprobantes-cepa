import { z } from 'zod'

const examSchema = z.object({
  number: z.string().trim().min(1, 'Escribe el número o selecciona una materia.'),
  name: z.string().trim().min(3, 'Escribe el nombre de la materia.'),
})

export const voucherSchema = z.object({
  name: z.string().trim().min(5, 'Revisa el nombre.'),
  matricula: z
    .string()
    .regex(/^\d{8,16}$/, 'La matrícula debe tener entre 8 y 16 dígitos.'),
  etapa: z.string().trim().min(4, 'Revisa la etapa.'),
  oficina: z
    .string()
    .regex(/^\d{3,6}$/, 'La oficina debe tener entre 3 y 6 dígitos.'),
  exams: z.array(examSchema).min(1, 'Agrega al menos un examen.'),
})