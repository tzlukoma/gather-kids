# Authentication and Protected Routes Strategy

## Overview

This document outlines the authentication and protected routes implementation for gatherKids, focusing on role-based access control and a consistent user experience.

## Current Implementation (Demo Mode)

### Role Types

```typescript
// src/lib/constants/roles.ts
export const ROLES = {
	ADMIN: 'admin',
	MINISTRY_LEADER: 'ministry_leader',
	GUARDIAN: 'guardian',
} as const;

export type UserRole = keyof typeof ROLES;
```

### Auth Context

The authentication context manages user state, loading states, and role information:

```typescript
// src/contexts/auth-context.tsx
interface AuthState {
	user: User | null;
	loading: boolean;
	userRole: UserRole | null;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState<UserRole | null>(null);

	// Demo mode implementation
	useEffect(() => {
		const demoAuth = async () => {
			// Simulate auth delay
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Demo user - this will be replaced with Supabase auth
			setUser({
				id: 'demo-user',
				email: 'demo@example.com',
				metadata: {
					household_id: 'demo-household',
				},
			});
			setUserRole('admin'); // Default demo role
			setLoading(false);
		};

		demoAuth();
	}, []);

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				userRole,
				setUserRole, // Exposed for demo mode role switching
			}}>
			{children}
		</AuthContext.Provider>
	);
};
```

### Protected Route Component

A reusable component that handles authentication, loading states, and role-based access:

```typescript
// src/components/auth/protected-route.tsx
export const ProtectedRoute = ({
	children,
	allowedRoles,
	loadingComponent = <DefaultLoadingSpinner />,
}: {
	children: React.ReactNode;
	allowedRoles: UserRole[];
	loadingComponent?: React.ReactNode;
}) => {
	const { user, loading, userRole } = useAuth();
	const router = useRouter();

	// Show loading state while authentication is being determined
	if (loading) return loadingComponent;

	// Redirect to login if not authenticated
	if (!loading && !user) {
		router.replace('/login');
		return loadingComponent;
	}

	// Redirect to unauthorized page if role not allowed
	if (!allowedRoles.includes(userRole)) {
		router.replace('/unauthorized');
		return loadingComponent;
	}

	// Render protected content if all checks pass
	return <>{children}</>;
};
```

### Loading States

Each protected route should implement appropriate loading states:

```typescript
// src/components/skeletons/profile-skeleton.tsx
export const ProfileSkeleton = () => (
	<div className="animate-pulse">
		<div className="h-12 w-48 bg-gray-200 rounded mb-4" />
		<div className="space-y-3">
			<div className="h-4 w-3/4 bg-gray-200 rounded" />
			<div className="h-4 w-1/2 bg-gray-200 rounded" />
		</div>
	</div>
);
```

## Implementation Examples

### Admin Dashboard

```typescript
// src/app/dashboard/page.tsx
export default function DashboardPage() {
	return (
		<ProtectedRoute
			allowedRoles={[ROLES.ADMIN, ROLES.MINISTRY_LEADER]}
			loadingComponent={<DashboardSkeleton />}>
			<Dashboard />
		</ProtectedRoute>
	);
}
```

### Guardian Household View

```typescript
// src/app/household/profile/page.tsx
export default function GuardianHouseholdPage() {
	const { user } = useAuth();

	return (
		<ProtectedRoute
			allowedRoles={[ROLES.GUARDIAN]}
			loadingComponent={<ProfileSkeleton />}>
			<HouseholdProfile householdId={user.metadata.household_id} />
		</ProtectedRoute>
	);
}
```

## Best Practices

1. **Early Loading States**: Always show loading components immediately while auth state is being determined
2. **Consistent Protection**: Use `ProtectedRoute` component for all restricted pages
3. **Type Safety**: Use the `UserRole` type and `ROLES` constant for role checks
4. **Loading UX**: Implement skeleton loading states that match the final UI layout
5. **Role Separation**: Clear separation between admin/leader and guardian views

## Testing Protected Routes

For demo mode testing, you can switch roles using the auth context:

```typescript
const { setUserRole } = useAuth();

// Switch to guardian role
setUserRole(ROLES.GUARDIAN);
```

## Future Implementation (Supabase)

When implementing Supabase:

1. Replace demo auth with Supabase authentication
2. Add `user_roles` table with RLS policies
3. Store `household_id` in user metadata during registration
4. Update `AuthProvider` to fetch roles from Supabase
5. Implement proper session management

> Note: The current implementation uses demo mode for development. Supabase implementation details will be added in a future update.
