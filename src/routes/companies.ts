import { Router } from 'express';
import { z } from 'zod';

import { CompanyHiringRole, CompanyStatus } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { registry } from '../openapi.js';

const Company = z
  .object({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    name: z.string(),
    domain: z.string(),
    summary: z.string().nullable(),
    logoUrl: z.string().nullable(),
    jobPostUrl: z.string().nullable(),
    role: z.enum(CompanyHiringRole),
    status: z.enum(CompanyStatus),
    linkedinUrl: z.string(),
  })
  .openapi('Company');

const CreateCompany = z
  .object({
    name: z.string().trim().min(1),
    domain: z.string().trim().min(1),
    summary: z.string().nullish(),
    logoUrl: z.url().nullish(),
    jobPostUrl: z.url().nullish(),
    role: z.enum(CompanyHiringRole),
    status: z.enum(CompanyStatus).default('new'),
    linkedinUrl: z.url(),
  })
  .openapi('CreateCompany');

const UpdateCompany = CreateCompany.partial().openapi('UpdateCompany');
const IdParams = z.object({ id: z.uuid() });

const json = (schema: z.ZodType) => ({ 'application/json': { schema } });
const errors = {
  400: { description: 'Validation failed' },
  401: { description: 'Unauthorized' },
  404: { description: 'Company not found' },
  409: { description: 'Name or domain already exists' },
};

registry.registerPath({
  method: 'get', path: '/companies', summary: 'List companies',
  responses: { 200: { description: 'Companies', content: json(z.array(Company)) }, 401: errors[401] },
});

registry.registerPath({
  method: 'post', path: '/companies', summary: 'Create a company',
  request: { body: { content: json(CreateCompany) } },
  responses: { 201: { description: 'Created', content: json(Company) }, 400: errors[400], 401: errors[401], 409: errors[409] },
});

registry.registerPath({
  method: 'get', path: '/companies/{id}', summary: 'Get a company',
  request: { params: IdParams },
  responses: { 200: { description: 'Company', content: json(Company) }, 400: errors[400], 401: errors[401], 404: errors[404] },
});

registry.registerPath({
  method: 'patch', path: '/companies/{id}', summary: 'Update a company',
  request: { params: IdParams, body: { content: json(UpdateCompany) } },
  responses: { 200: { description: 'Updated', content: json(Company) }, ...errors },
});

registry.registerPath({
  method: 'post', path: '/companies/{id}/archive', summary: 'Archive a company',
  request: { params: IdParams },
  responses: { 200: { description: 'Archived', content: json(Company) }, 400: errors[400], 401: errors[401], 404: errors[404] },
});

export const companiesRouter = Router();
companiesRouter.use('/companies', requireAuth);

companiesRouter.get('/companies', async (_req, res) => {
  res.json(await prisma.company.findMany({ orderBy: { createdAt: 'desc' } }));
});

companiesRouter.post('/companies', async (req, res) => {
  const data = CreateCompany.parse(req.body);
  res.status(201).json(await prisma.company.create({ data }));
});

companiesRouter.get('/companies/:id', async (req, res) => {
  const { id } = IdParams.parse(req.params);
  res.json(await prisma.company.findUniqueOrThrow({ where: { id } }));
});

companiesRouter.patch('/companies/:id', async (req, res) => {
  const { id } = IdParams.parse(req.params);
  const data = UpdateCompany.parse(req.body);
  res.json(await prisma.company.update({ where: { id }, data }));
});

companiesRouter.post('/companies/:id/archive', async (req, res) => {
  const { id } = IdParams.parse(req.params);
  res.json(await prisma.company.update({ where: { id }, data: { status: 'archived' } }));
});
