# Healthcare Billing & Finance System

A comprehensive billing and finance management system for healthcare facilities, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Secure Login System**: Innovative login page with healthcare-themed design
- **Billing Management**: Create and manage patient bills
- **Invoice Generation**: Generate professional invoices
- **Payment Processing**: Handle payments and receipts
- **Insurance Claims**: Manage insurance claim workflows
- **Dashboard**: Overview of billing activities and metrics

## Getting Started

First, install dependencies:

```bash
npm install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the login page.

## Project Structure

- `app/` - Next.js app directory
  - `page.tsx` - Login page (main landing page)
  - `dashboard/` - Main application dashboard
  - `api/` - API routes for backend functionality
- `components/` - Reusable UI components
  - `ui/` - Base UI components (shadcn/ui)
  - `billing/` - Billing-specific components
- `lib/` - Utility functions and configurations

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Theme**: next-themes for dark/light mode

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
