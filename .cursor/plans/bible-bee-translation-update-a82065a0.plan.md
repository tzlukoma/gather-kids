<!-- a82065a0-78d5-4be3-9eae-130e6afd2c78 bc6983b0-550c-451f-b512-e6f1fea1078c -->
# Add Search by Household Name and Child to Registrations View

## Overview

Add real-time search functionality to the Registrations page with two search inputs (household name and child name), filter pills showing active filters, and highlighted matching children in results. All filters work together. Leverages TanStack Query's `select` option for optimized filtering with proper caching.

## Implementation Details

### 1. Update Registrations Page Component

**File**: `src/app/dashboard/registrations/page.tsx`

**Add state for search terms** (after line 33):

```typescript
const [householdSearchTerm, setHouseholdSearchTerm] = useState<string>('');
const [childSearchTerm, setChildSearchTerm] = useState<string>('');
```

**Add imports** (line 1-28):

- `useMemo` from `react`
- `Input` from `@/components/ui/input`
- `Badge` from `@/components/ui/badge`
- `Search` icon from `lucide-react`
- `X` icon from `lucide-react` (for clearing filters)

**Update useHouseholdList hook call** (lines 94-96) to use TanStack Query's `select` option for filtering:

```typescript
const { data: households = [], isLoading: householdsLoading } = useHouseholdList(
  ministryFilterIds,
  ministryFilter || undefined
);

// Client-side filtering using useMemo for optimal performance
const filteredHouseholds = useMemo(() => {
  if (!households) return [];
  
  let filtered = [...households];
  
  // Filter by household name
  if (householdSearchTerm.trim()) {
    const term = householdSearchTerm.toLowerCase();
    filtered = filtered.filter(h => 
      h.name?.toLowerCase().includes(term)
    );
  }
  
  // Filter by child name
  if (childSearchTerm.trim()) {
    const term = childSearchTerm.toLowerCase();
    filtered = filtered.filter(h => {
      return (h.children || []).some(c => 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) ||
        c.first_name.toLowerCase().includes(term) ||
        c.last_name.toLowerCase().includes(term)
      );
    });
  }
  
  return filtered;
}, [households, householdSearchTerm, childSearchTerm]);
```

**Add helper function to highlight matching children** (after filteredHouseholds):

```typescript
const highlightMatchingChild = (child: Child & { age: number | null }) => {
  const childName = `${child.first_name} (${child.age})`;
  if (!childSearchTerm.trim()) return childName;
  
  const term = childSearchTerm.toLowerCase();
  const fullName = `${child.first_name} ${child.last_name}`.toLowerCase();
  const isMatch = fullName.includes(term) || 
                  child.first_name.toLowerCase().includes(term) ||
                  child.last_name.toLowerCase().includes(term);
  
  return isMatch ? (
    <span className="font-semibold text-primary">{childName}</span>
  ) : (
    childName
  );
};
```

**Update CardHeader section** (lines 156-175) with new filter UI:

Replace the existing filter section with:

```typescript
<CardHeader className="flex flex-col gap-4">
  <div>
    <CardTitle className="font-headline">Registered Households</CardTitle>
    <CardDescription>
      Click on a household to view their full profile.
    </CardDescription>
  </div>
  
  {/* Search and Filter Controls */}
  <div className="flex flex-col gap-3">
    {/* Two search inputs */}
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by household name..."
          value={householdSearchTerm}
          onChange={(e) => setHouseholdSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by child name..."
          value={childSearchTerm}
          onChange={(e) => setChildSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
    
    {/* Ministry filter dropdown */}
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Combobox
        options={ministryOptions}
        value={ministryFilter}
        onChange={setMinistryFilter}
        placeholder="Filter by ministry..."
        clearable={true}
      />
    </div>
    
    {/* Filter Pills */}
    {(householdSearchTerm || childSearchTerm || ministryFilter) && (
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Active filters:</span>
        {householdSearchTerm && (
          <Badge variant="secondary" className="gap-1">
            Household: {householdSearchTerm}
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={() => setHouseholdSearchTerm('')}
            />
          </Badge>
        )}
        {childSearchTerm && (
          <Badge variant="secondary" className="gap-1">
            Child: {childSearchTerm}
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={() => setChildSearchTerm('')}
            />
          </Badge>
        )}
        {ministryFilter && (
          <Badge variant="secondary" className="gap-1">
            Ministry: {ministryOptions.find(m => m.value === ministryFilter)?.label}
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={() => setMinistryFilter(null)}
            />
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setHouseholdSearchTerm('');
            setChildSearchTerm('');
            setMinistryFilter(null);
          }}
          className="h-6 text-xs"
        >
          Clear all
        </Button>
      </div>
    )}
  </div>
</CardHeader>
```

**Update table body** (line 187):

Change from `households` to `filteredHouseholds`:

```typescript
{filteredHouseholds.map((household) => (
```

**Update Children column rendering** (lines 198-202):

Modify to use the highlight helper with React fragments:

```typescript
<TableCell>
  {(household.children || [])
    .map((c, idx) => (
      <React.Fragment key={c.child_id}>
        {idx > 0 && ', '}
        {highlightMatchingChild(c)}
      </React.Fragment>
    ))}
</TableCell>
```

**Update empty state** (line 208):

Change condition to use `filteredHouseholds`:

```typescript
{filteredHouseholds.length === 0 && (
```

### 2. Why This Approach Leverages TanStack Query Optimally

**Client-side filtering is the right choice here because:**

1. **Data is already cached**: `useHouseholdList` already fetches all household data with children and caches it via TanStack Query
2. **No additional API calls**: Filtering happens on cached data, no re-fetching needed
3. **Fast and responsive**: Real-time filtering feels instant since it's in-memory
4. **Ministry filter already works this way**: The existing ministry filter uses the same client-side approach in `queryHouseholdList`
5. **useMemo optimization**: Prevents unnecessary re-filtering on unrelated re-renders
6. **TanStack Query handles the heavy lifting**: Automatic caching, refetching, and cache invalidation for the base data

**The data flow:**

```
useHouseholdList (TanStack Query)
  → Fetches & caches all households + children
  → ministryFilterIds already applied server-side in DAL
    → useMemo filters cached data by search terms
      → Instant UI updates with highlighted matches
```

### 3. Performance Considerations

- TanStack Query caches all household data with `cacheConfig.moderate` (5 minute stale time)
- `useMemo` prevents re-filtering unless `households`, `householdSearchTerm`, or `childSearchTerm` changes
- No debouncing needed - filtering is instant on cached data
- React fragments with keys prevent unnecessary child re-renders
- Ministry filter continues to work server-side in `queryHouseholdList` for optimal data fetching

### 4. Responsive Design

- Search inputs stack vertically on mobile, horizontal on desktop (`sm:flex-row`)
- Filter pills wrap naturally with `flex-wrap`
- Ministry dropdown stays on same row on desktop, moves to separate row on mobile
- Proper min-width on inputs prevents them from shrinking too small

## Testing Checklist

- Search by household name filters results correctly
- Search by child name shows only households with matching children
- Matching children are highlighted in bold with primary color
- All three filters work together (household + child + ministry)
- Filter pills display correctly with proper labels
- Clicking X on a pill clears that specific filter
- "Clear all" button removes all active filters
- Empty state shows when no results match filters
- Search is case-insensitive
- Partial matches work (e.g., "Joh" matches "John")
- Performance is smooth with real-time filtering on large datasets
- TanStack Query cache is properly utilized (no refetching on filter changes)

### To-dos

- [ ] Create database migration to add preferred_scripture_translation column to children table
- [ ] Regenerate Supabase types to include new children.preferred_scripture_translation field
- [ ] Add preferred_scripture_translation field to Child interface in src/lib/types.ts
- [ ] Update SupabaseAdapter.updateChild() to handle preferred_scripture_translation field
- [ ] Add scripture translation dropdown to EditChildModal component
- [ ] Update bibleBee hooks to check child-level translation preference before household default