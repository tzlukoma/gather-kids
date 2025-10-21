import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import BrandingPage from '@/app/dashboard/branding/page';
import { renderWithAuth, mockUsers } from '@/test-utils/auth/test-utils';
import { useToast } from '@/hooks/use-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('next/navigation', () => ({
	useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
	useToast: jest.fn(),
}));

jest.mock('@/hooks/data', () => ({
	useBrandingSettings: jest.fn(),
	useSaveBrandingSettings: jest.fn(),
}));

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('BrandingPage', () => {
	const mockPush = jest.fn();
	const mockBack = jest.fn();
	const mockToast = jest.fn();
	const mockMutateAsync = jest.fn();

	const defaultBrandingSettings = {
		app_name: 'gatherKids',
		description:
			"The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
		logo_url: undefined,
		youtube_url: undefined,
		instagram_url: undefined,
	};

	const customBrandingSettings = {
		app_name: 'MyCustomApp',
		description: 'Custom description for my app',
		logo_url: 'data:image/png;base64,test',
		youtube_url: 'https://youtube.com/@mychannel',
		instagram_url: 'https://instagram.com/myprofile',
	};

	// Create a test query client
	const createTestQueryClient = () =>
		new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});

	const renderWithQueryClient = (component: React.ReactElement) => {
		const queryClient = createTestQueryClient();
		return render(
			<QueryClientProvider client={queryClient}>
				{component}
			</QueryClientProvider>
		);
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockRouter.mockReturnValue({
			push: mockPush,
			back: mockBack,
		} as any);

		mockUseToast.mockReturnValue({
			toast: mockToast,
			dismiss: jest.fn(),
			toasts: [],
		});

		// Mock React Query hooks
		const {
			useBrandingSettings,
			useSaveBrandingSettings,
		} = require('@/hooks/data');
		useBrandingSettings.mockReturnValue({
			data: defaultBrandingSettings,
			isLoading: false,
			error: null,
		});

		useSaveBrandingSettings.mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: false,
		});

		mockMutateAsync.mockResolvedValue('test-id');
	});

	describe('Authorization', () => {
		it('should redirect non-admin users to dashboard', () => {
			renderWithAuth(<BrandingPage />, { user: mockUsers.guardian });
			expect(mockPush).toHaveBeenCalledWith('/dashboard');
		});

		it('should show loading state for auth loading', () => {
			renderWithAuth(<BrandingPage />, {
				user: mockUsers.admin,
				loading: true,
			});
			// The component shows a skeleton loader instead of "Loading..." text
			// Check that the skeleton loader is present (there are multiple generic elements)
			expect(screen.getAllByRole('generic')).toHaveLength(44); // All skeleton elements
		});

		it('should show page for admin users', () => {
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });
			expect(screen.getByText('Branding & Private Label')).toBeInTheDocument();
		});
	});

	describe('Form Rendering', () => {
		it('should render all form sections', () => {
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			expect(screen.getByText('App Identity')).toBeInTheDocument();
			expect(screen.getByText('Logo')).toBeInTheDocument();
			expect(screen.getByText('Social Media Links')).toBeInTheDocument();
		});

		it('should render all form fields', () => {
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			expect(screen.getByLabelText('App Name')).toBeInTheDocument();
			expect(
				screen.getByLabelText('Description / Tagline')
			).toBeInTheDocument();
			expect(screen.getByLabelText('Upload Logo')).toBeInTheDocument();
			expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
			expect(screen.getByLabelText('Instagram URL')).toBeInTheDocument();
		});

		it('should populate form with current settings', () => {
			const { useBrandingSettings } = require('@/hooks/data');
			useBrandingSettings.mockReturnValue({
				data: customBrandingSettings,
				isLoading: false,
				error: null,
			});

			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			expect(screen.getByDisplayValue('MyCustomApp')).toBeInTheDocument();
			expect(
				screen.getByDisplayValue('Custom description for my app')
			).toBeInTheDocument();
			expect(
				screen.getByDisplayValue('https://youtube.com/@mychannel')
			).toBeInTheDocument();
			expect(
				screen.getByDisplayValue('https://instagram.com/myprofile')
			).toBeInTheDocument();
		});
	});

	describe('Form Input Handling', () => {
		it('should update app name input', async () => {
			const user = userEvent.setup();
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const appNameInput = screen.getByLabelText('App Name');
			await user.clear(appNameInput);
			await user.type(appNameInput, 'New App Name');

			expect(appNameInput).toHaveValue('New App Name');
		});

		it('should update description textarea', async () => {
			const user = userEvent.setup();
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const descriptionInput = screen.getByLabelText('Description / Tagline');
			await user.clear(descriptionInput);
			await user.type(descriptionInput, 'New description');

			expect(descriptionInput).toHaveValue('New description');
		});

		it('should update social media URLs', async () => {
			const user = userEvent.setup();
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const youtubeInput = screen.getByLabelText('YouTube URL');
			const instagramInput = screen.getByLabelText('Instagram URL');

			await user.clear(youtubeInput);
			await user.type(youtubeInput, 'https://youtube.com/@new');
			await user.clear(instagramInput);
			await user.type(instagramInput, 'https://instagram.com/new');

			expect(youtubeInput).toHaveValue('https://youtube.com/@new');
			expect(instagramInput).toHaveValue('https://instagram.com/new');
		});
	});

	describe('Logo Upload', () => {
		it('should handle valid image upload', async () => {
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const file = new File(['test'], 'test.png', { type: 'image/png' });
			Object.defineProperty(file, 'size', { value: 100 * 1024 }); // 100KB

			// Mock FileReader for this test
			const mockReadAsDataURL = jest.fn();
			const mockFileReader = {
				readAsDataURL: mockReadAsDataURL,
				onload: null,
				result: 'data:image/png;base64,testimage',
			};
			(global as any).FileReader = jest
				.fn()
				.mockImplementation(() => mockFileReader);

			const fileInput = screen.getByLabelText(
				'Upload Logo'
			) as HTMLInputElement;

			// Simulate file selection and trigger change event
			Object.defineProperty(fileInput, 'files', {
				value: [file],
				writable: false,
			});

			fireEvent.change(fileInput);

			expect(FileReader).toHaveBeenCalled();
			expect(mockReadAsDataURL).toHaveBeenCalledWith(file);
		});

		it('should reject files that are too large', async () => {
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const file = new File(['test'], 'test.png', { type: 'image/png' });
			Object.defineProperty(file, 'size', { value: 600 * 1024 }); // 600KB (too large)

			const fileInput = screen.getByLabelText(
				'Upload Logo'
			) as HTMLInputElement;

			// Simulate file selection and trigger change event
			Object.defineProperty(fileInput, 'files', {
				value: [file],
				writable: false,
			});

			fireEvent.change(fileInput);

			expect(mockToast).toHaveBeenCalledWith({
				title: 'File Too Large',
				description: 'Please select an image smaller than 500KB.',
				variant: 'destructive',
			});
		});

		it('should reject non-image files', async () => {
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const file = new File(['test'], 'test.txt', { type: 'text/plain' });
			const fileInput = screen.getByLabelText(
				'Upload Logo'
			) as HTMLInputElement;

			// Simulate file selection and trigger change event
			Object.defineProperty(fileInput, 'files', {
				value: [file],
				writable: false,
			});

			fireEvent.change(fileInput);

			expect(mockToast).toHaveBeenCalledWith({
				title: 'Invalid File Type',
				description: 'Please select an image file.',
				variant: 'destructive',
			});
		});

		it('should show logo preview when logo is uploaded', () => {
			const { useBrandingSettings } = require('@/hooks/data');
			useBrandingSettings.mockReturnValue({
				data: {
					...defaultBrandingSettings,
					logo_url: 'data:image/png;base64,test',
				},
				isLoading: false,
				error: null,
			});

			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const logoPreview = screen.getByAltText('Logo preview');
			expect(logoPreview).toBeInTheDocument();
			expect(logoPreview).toHaveAttribute('src', 'data:image/png;base64,test');
		});

		it('should allow removing uploaded logo', async () => {
			const user = userEvent.setup();
			const { useBrandingSettings } = require('@/hooks/data');
			useBrandingSettings.mockReturnValue({
				data: {
					...defaultBrandingSettings,
					logo_url: 'data:image/png;base64,test',
				},
				isLoading: false,
				error: null,
			});

			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const removeButton = screen.getByText('Remove Logo');
			await user.click(removeButton);

			// The logo should be removed from preview
			expect(screen.queryByAltText('Logo preview')).not.toBeInTheDocument();
		});
	});

	describe('Form Submission', () => {
		it('should save settings successfully', async () => {
			const user = userEvent.setup();
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const appNameInput = screen.getByLabelText('App Name');
			await user.clear(appNameInput);
			await user.type(appNameInput, 'Updated App');

			const submitButton = screen.getByText('Save Settings');
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					orgId: 'default',
					settings: {
						app_name: 'Updated App',
						description: defaultBrandingSettings.description,
						logo_url: undefined,
						youtube_url: undefined,
						instagram_url: undefined,
						use_logo_only: false,
					},
				});
			});

			expect(mockToast).toHaveBeenCalledWith({
				title: 'Settings Saved',
				description: 'Branding settings have been updated successfully.',
			});
		});

		it('should handle save errors', async () => {
			const user = userEvent.setup();
			mockMutateAsync.mockRejectedValue(new Error('Save failed'));
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const submitButton = screen.getByText('Save Settings');
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockToast).toHaveBeenCalledWith({
					title: 'Error',
					description: 'Failed to save branding settings. Please try again.',
					variant: 'destructive',
				});
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to save branding settings:',
				expect.any(Error)
			);
			consoleSpy.mockRestore();
		});

		it('should disable form during submission', async () => {
			const user = userEvent.setup();

			const { useSaveBrandingSettings } = require('@/hooks/data');
			useSaveBrandingSettings.mockReturnValue({
				mutateAsync: mockMutateAsync,
				isPending: true, // Set to true to simulate loading state
			});

			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			// Check that the button shows "Saving..." when isPending is true
			expect(screen.getByText('Saving...')).toBeInTheDocument();
			expect(screen.getByText('Reset to Defaults')).toBeDisabled();
			expect(screen.getByText('Cancel')).toBeDisabled();
		});
	});

	describe('Reset to Defaults', () => {
		it('should reset form to default values', async () => {
			const user = userEvent.setup();
			const { useBrandingSettings } = require('@/hooks/data');
			useBrandingSettings.mockReturnValue({
				data: customBrandingSettings,
				isLoading: false,
				error: null,
			});

			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const resetButton = screen.getByText('Reset to Defaults');
			await user.click(resetButton);

			expect(screen.getByDisplayValue('gatherKids')).toBeInTheDocument();
			expect(
				screen.getByDisplayValue(
					/The simple, secure, and smart way to manage your children.*ministry/
				)
			).toBeInTheDocument();

			// Check YouTube and Instagram URLs are empty using more specific queries
			const youtubeInput = screen.getByLabelText('YouTube URL');
			const instagramInput = screen.getByLabelText('Instagram URL');
			expect(youtubeInput).toHaveValue('');
			expect(instagramInput).toHaveValue('');
		});
	});

	describe('Navigation', () => {
		it('should handle cancel button click', async () => {
			const user = userEvent.setup();
			renderWithAuth(<BrandingPage />, { user: mockUsers.admin });

			const cancelButton = screen.getByText('Cancel');
			await user.click(cancelButton);

			expect(mockBack).toHaveBeenCalled();
		});
	});
});
