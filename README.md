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
│   │   └── ministrysync/     # Ministry-specific components
│   ├── contexts/              # React contexts (auth, features)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and data access
│   └── ai/                    # AI/Genkit integration
├── docs/                      # Documentation
├── public/                    # Static assets
└── tailwind.config.ts         # Tailwind CSS configuration
```

## 🗄️ Database

The application uses IndexedDB (via Dexie.js) for client-side data persistence. Sample data is automatically seeded when you first access the application.

### Key Data Models

- **Household**: Family unit information
- **Guardian**: Parent/guardian details
- **Child**: Individual child records with medical/allergy info
- **Ministry**: Program configuration and settings
- **Registration**: Annual enrollment records
- **Attendance**: Check-in/out tracking
- **Incident**: Safety and behavior reporting

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

### 2. Component Guidelines

- Use Radix UI primitives for accessibility
- Implement responsive design with Tailwind CSS
- Follow the established form patterns with React Hook Form + Zod
- Use the `useAuth` hook for authentication state
- Implement real-time updates with Dexie React Hooks

### 3. Testing

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build verification
npm run build
```

## 🚀 Deployment

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
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## 📚 Additional Resources

- **FEATURES.md**: Comprehensive feature documentation
- **docs/blueprint.md**: Application blueprint and requirements
- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com)
- **Radix UI**: [https://www.radix-ui.com](https://www.radix-ui.com)
- **Next.js**: [https://nextjs.org](https://nextjs.org)

## 🆘 Troubleshooting

### Common Issues

1. **Port Already in Use**: The app runs on port 9002 by default. Change it in `package.json` if needed.
2. **Build Errors**: Ensure all dependencies are installed with `npm install`
3. **Type Errors**: Run `npm run typecheck` to identify TypeScript issues
4. **Database Issues**: Clear browser IndexedDB storage if data becomes corrupted

### Getting Help

- Check the console for error messages
- Verify all environment variables are set correctly
- Ensure you're using the correct Node.js version
- Check that all dependencies are properly installed

## 📄 License

This project is proprietary software. All rights reserved.

---

**Happy coding! 🎉**
