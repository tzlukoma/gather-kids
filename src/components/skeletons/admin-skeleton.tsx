export const AdminSkeleton = () => {
	return (
		<div className="h-screen flex animate-pulse">
			{/* Sidebar Skeleton */}
			<div className="w-64 border-r bg-background p-4">
				<div className="h-8 w-32 bg-gray-200 rounded mb-8" />
				<div className="space-y-4">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div key={i} className="flex items-center space-x-3">
							<div className="h-5 w-5 bg-gray-200 rounded" />
							<div className="h-4 w-24 bg-gray-200 rounded" />
						</div>
					))}
				</div>
			</div>

			{/* Main Content Skeleton */}
			<div className="flex-1 p-8">
				<div className="h-8 w-48 bg-gray-200 rounded mb-8" />
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div key={i} className="p-6 border rounded-lg">
							<div className="h-6 w-32 bg-gray-200 rounded mb-4" />
							<div className="space-y-2">
								<div className="h-4 w-full bg-gray-200 rounded" />
								<div className="h-4 w-3/4 bg-gray-200 rounded" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
