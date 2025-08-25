export const GuardianSkeleton = () => {
	return (
		<div className="container mx-auto px-4 py-6 animate-pulse">
			<div className="h-8 w-48 bg-gray-200 rounded mb-6" />
			<div className="space-y-6">
				<div>
					<div className="h-6 w-32 bg-gray-200 rounded mb-4" />
					<div className="space-y-3">
						<div className="h-4 w-3/4 bg-gray-200 rounded" />
						<div className="h-4 w-1/2 bg-gray-200 rounded" />
					</div>
				</div>
				<div>
					<div className="h-6 w-40 bg-gray-200 rounded mb-4" />
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="p-4 border rounded-lg">
								<div className="h-4 w-24 bg-gray-200 rounded mb-2" />
								<div className="h-4 w-32 bg-gray-200 rounded" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
