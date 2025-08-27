# gatherKids

A comprehensive children's ministry management system designed to streamline registration, check-in/out processes, incident management, and administrative oversight for church ministries.

## 🚀 Features

- **Family Registration**: Complete household profiles with multi-child support
- **Check-In/Out Management**: Real-time attendance tracking with guardian verification
- **Incident Reporting**: Comprehensive incident logging with severity tracking
- **Ministry Management**: Flexible program configuration and enrollment tracking
- **Role-Based Access**: Secure admin and leader permissions
- **Mobile-First Design**: Responsive interface optimized for all devices
- **Real-Time Updates**: Live data synchronization across all users
- **Reporting & Export**: Comprehensive data export and analytics
- **Sample Data**: Built-in seeding system for demonstration

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with React 18, TypeScript
- **UI Components**: Radix UI with custom Tailwind CSS styling
- **State Management**: React Context API with custom hooks
- **Database**: IndexedDB (Dexie.js) for client-side data persistence
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Custom context-based auth system
- **Real-time Updates**: Dexie React Hooks for live data queries

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd gather-kids
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

The application uses environment variables for configuration. Create a `.env.local` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env.local
# or create manually
touch .env.local
```

Add the following environment variables to `.env.local`:

```env
# Application Configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
NEXT_PUBLIC_SHOW_DEMO_FEATURES=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=false

# Development Settings
NODE_ENV=development
```

### 4. Start the Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:9002` (note the custom port).

### 5. Access the Application

Open your browser and navigate to `http://localhost:9002`

## 🔐 Demo Accounts

The application includes pre-configured demo accounts for testing:

### Administrator

- **Email**: `admin@example.com`
- **Password**: `password`
- **Access**: Full system access, all features

### Ministry Leaders

- **Generic Leader**: `leader.generic@example.com` / `password`
- **Khalfani Leader**: `leader.khalfani@example.com` / `password`
- **Joy Bells Leader**: `leader.joybells@example.com` / `password`
- **Inactive Leader**: `leader.inactive@example.com` / `password`

## 📱 Available Scripts

```bash
# Development
npm run dev          # Start development server on port 9002
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking

# Database Management
npm run db:generate  # Generate Prisma client
npm run db:push      # Push Prisma schema to database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database and reseed

# AI Development (Genkit)
npm run genkit:dev   # Start Genkit AI development server
npm run genkit:watch # Start Genkit with file watching
```

## 🏗️ Project Structure

```
gather-kids/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/         # Admin and leader dashboard
│   │   ├── login/            # Authentication pages
│   │   └── register/         # Family registration
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components (Radix)
│   │   └── gatherKids/     # Application-specific components
│   ├── contexts/              # React contexts (auth, features)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and data access
│   │   ├── database/         # Database abstraction layer
│   │   │   ├── types.ts      # Database adapter interface
│   │   │   ├── factory.ts    # Database adapter factory
│   │   │   ├── indexeddb-adapter.ts
│   │   │   ├── prisma-adapter.ts
│   │   │   └── supabase-adapter.ts
│   │   └── ai/               # AI/Genkit integration
├── prisma/                    # Prisma schema and migrations
│   ├── schema.prisma         # Database schema definition
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Database seeding script
├── docs/                      # Documentation
├── public/                    # Static assets
└── tailwind.config.ts         # Tailwind CSS configuration
```

## 🗄️ Database

The application supports multiple database backends based on the environment:

- **Demo Mode**: IndexedDB (via Dexie.js) for client-side data persistence
- **Local Development**: SQLite (via Prisma) for local development
- **Production**: Supabase (PostgreSQL) for production environments

### Database Modes

The database mode is controlled by the `NEXT_PUBLIC_DATABASE_MODE` environment variable:

- `demo`: Uses IndexedDB (browser storage)
- `prisma`: Uses SQLite with Prisma ORM
- `supabase`: Uses Supabase cloud database

### Key Data Models

- **Household**: Family unit information
- **Guardian**: Parent/guardian details
- **Child**: Individual child records with medical/allergy info
- **Ministry**: Program configuration and settings
- **Registration**: Annual enrollment records
- **Attendance**: Check-in/out tracking
- **Incident**: Safety and behavior reporting

### Prisma Schema

The application includes a comprehensive Prisma schema that defines all data models with proper relationships and constraints. Run `npm run db:studio` to explore the database structure visually.

## 🎨 Styling

The application uses Tailwind CSS with a custom design system:

- **Primary Color**: Calming blue (#64B5F6)
- **Background**: Light blue (#E3F2FD)
- **Accent**: Vibrant orange (#FFB74D)
- **Typography**: Poppins (headlines), PT Sans (body)

## 🔧 Development Workflow

### 1. Feature Development

1. Create feature branches from `main`
2. Implement features following the established patterns
3. Use TypeScript for type safety
4. Follow the component structure in `src/components/`
5. Update types in `src/lib/types.ts` as needed

### 2. Database Development

1. **Local Development**: Use Prisma with SQLite for local development

   ```bash
   npm run db:generate  # Generate Prisma client
   npm run db:push      # Push schema changes
   npm run db:seed      # Seed with sample data
   npm run db:studio    # Visual database explorer
   ```

2. **Schema Changes**: Update `prisma/schema.prisma` and run migrations

   ```bash
   npm run db:migrate   # Create and apply migrations
   npm run db:push      # Push changes directly (development)
   ```

3. **Testing**: Test with different database modes using environment variables

   ```bash
   # Demo mode (IndexedDB)
   NEXT_PUBLIC_DATABASE_MODE=demo npm run dev

   # Prisma mode (SQLite)
   NEXT_PUBLIC_DATABASE_MODE=prisma npm run dev

   # Supabase mode (Production)
   NEXT_PUBLIC_DATABASE_MODE=supabase npm run dev
   ```

### 3. Component Guidelines

- Use Radix UI primitives for accessibility
- Implement responsive design with Tailwind CSS
- Follow the established form patterns with React Hook Form + Zod
- Use the `useAuth` hook for authentication state
- Implement real-time updates with the appropriate database adapter
- Use the database abstraction layer for all data operations

### 4. Testing

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build verification
npm run build

# Database testing
npm run db:seed      # Seed test data
npm run db:studio    # Inspect database state
```

## 🚀 Deployment

### Local Development Setup

1. **Install Prisma Dependencies**

   ```bash
   npm install prisma @prisma/client
   npm install -D prisma
   ```

2. **Initialize Database**

   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Build for Production

```bash
npm run build
npm run start
```

### Environment Variables for Production

Ensure all required environment variables are set in your production environment:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
NEXT_PUBLIC_ENABLE_SUPABASE_MODE=true
NEXT_PUBLIC_ENABLE_PRISMA_MODE=false
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## 📚 Additional Resources

- **FEATURES.md**: Comprehensive feature documentation
- **SUPABASE_IMPLEMENTATION_PLAN.md**: Detailed Supabase integration plan
- **docs/blueprint.md**: Application blueprint and requirements
- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com)
- **Radix UI**: [https://www.radix-ui.com](https://www.radix-ui.com)
- **Next.js**: [https://nextjs.org](https://nextjs.org)
- **Prisma**: [https://www.prisma.io](https://www.prisma.io)
- **Supabase**: [https://supabase.com](https://supabase.com)

## 🆘 Troubleshooting

### Common Issues

1. **Port Already in Use**: The app runs on port 9002 by default. Change it in `package.json` if needed.
2. **Build Errors**: Ensure all dependencies are installed with `npm install`
3. **Type Errors**: Run `npm run typecheck` to identify TypeScript issues
4. **Database Issues**:
   - **IndexedDB**: Clear browser storage if data becomes corrupted
   - **Prisma**: Run `npm run db:reset` to reset and reseed the database
   - **Supabase**: Check connection and authentication settings
5. **Prisma Issues**:
   - Run `npm run db:generate` after schema changes
   - Ensure `DATABASE_URL` is set correctly in `.env.local`
   - Use `npm run db:studio` to inspect database state

### Getting Help

- Check the console for error messages
- Verify all environment variables are set correctly
- Ensure you're using the correct Node.js version
- Check that all dependencies are properly installed
- **Database Mode Issues**: Verify `NEXT_PUBLIC_DATABASE_MODE` is set correctly
- **Prisma Issues**: Check `prisma/schema.prisma` and run `npm run db:generate`
- **Supabase Issues**: Verify project URL and API keys in environment variables

## 📄 License

This project is proprietary software. All rights reserved.

---

**Happy coding! 🎉**
