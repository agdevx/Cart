// ABOUTME: Active trip page for shopping mode
// ABOUTME: Shows checklist of items to purchase with check/uncheck functionality

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query';
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query';
import { useCheckTripItemMutation } from '@/apis/agdevx-cart-api/trip/check-trip-item.mutation';
import { useCompleteTripMutation } from '@/apis/agdevx-cart-api/trip/complete-trip.mutation';
import { useDeleteTripItemMutation } from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation';
import { useUpdateTripItemMutation } from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation';
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query';
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query';
import { ROUTES, tripDetailPath } from '@/routes';
import { useSSE } from '@/services/use-sse.service';
import { useStoreAccordionState } from '@/services/use-store-accordion-state.service';
import { ConfirmDialog } from '@/shared/confirm-dialog';
import { EmptyState } from '@/shared/empty-state';
import { SectionHeader } from '@/shared/section-header';
import { Spinner } from '@/shared/spinner';
import { StoreAccordion } from '@/shared/store-accordion';
import { TripItemRow } from '@/shared/trip-item-row';
import { fireCompletionConfetti } from '@/utils/confetti';
import { getStoreDisplayNames } from '@/utils/get-store-display-names';

export const ActiveTripPage = () => {
	const { tripId } = useParams<{ tripId: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!);
	const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!);
	const { data: households } = useHouseholdsQuery();
	const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households]);
	const { data: stores } = useStoresQuery(householdIds);
	const { isExpanded, toggleStore, autoCollapseIfAllChecked, cleanup } = useStoreAccordionState(tripId!, 'shopping', trip?.isCompleted ?? false);
	const checkMutation = useCheckTripItemMutation();
	const completeMutation = useCompleteTripMutation();
	const updateMutation = useUpdateTripItemMutation();
	const deleteMutation = useDeleteTripItemMutation();

	const storeDisplayNames = useMemo(() => getStoreDisplayNames(stores ?? [], households ?? []), [stores, households]);

	const groupedItems = useMemo(() => {
		if (!tripItems) return [];
		const groups: Record<string, typeof tripItems> = {};
		tripItems.forEach((item) => {
			const key = item.storeName ?? 'Any Store';
			(groups[key] ??= []).push(item);
		});
		return Object.entries(groups).sort(([a], [b]) => {
			if (a === 'Any Store') return 1;
			if (b === 'Any Store') return -1;
			return a.localeCompare(b);
		});
	}, [tripItems]);

	// Auto-collapse store groups where all items are checked
	useEffect(() => {
		groupedItems.forEach(([storeName, storeItems]) => {
			const allChecked = storeItems.every((item) => item.isChecked);
			autoCollapseIfAllChecked(storeName, allChecked);
		});
	}, [groupedItems, autoCollapseIfAllChecked]);

	const handleSSEMessage = useCallback(
		(_data: unknown) => {
			// Invalidate trip items query to refetch with latest data
			queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'items'] });
		},
		[queryClient, tripId]
	);

	// Connect to SSE for real-time updates
	useSSE(`/api/v1/trips/${tripId}/events`, handleSSEMessage, !!tripId);

	const handleToggleItem = (tripItemId: string, currentlyChecked: boolean) => {
		if (!tripId) return;
		checkMutation.mutate({
			tripId,
			tripItemId,
			isChecked: !currentlyChecked
		});
	};

	const handleUpdateItem = (tripItemId: string, quantity: number, notes: string | null, storeId: string | null) => {
		if (!tripId) return;
		updateMutation.mutate({ tripItemId, tripId, quantity, notes, storeId });
	};

	const handleDeleteItem = (tripItemId: string) => {
		if (!tripId) return;
		deleteMutation.mutate({ tripItemId, tripId });
	};

	const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

	const handleCompleteTrip = async () => {
		if (!tripId) return;

		const allChecked = tripItems?.every((item) => item.isChecked);

		if (!allChecked) {
			setShowCompleteConfirm(true);
			return;
		}

		await doCompleteTrip();
	};

	const doCompleteTrip = async () => {
		if (!tripId) return;

		try {
			await completeMutation.mutateAsync(tripId);
			fireCompletionConfetti();
			cleanup();
			setTimeout(() => navigate(ROUTES.SHOPPING), 1500);
		} catch {
			// Error toast shown by global MutationCache handler
		}
	};

	if (tripLoading || itemsLoading) {
		return (
			<div className='px-5 pt-7'>
				<p className='text-text-secondary'>Loading trip...</p>
			</div>
		);
	}

	if (!trip) {
		return (
			<div className='px-5 pt-7'>
				<p className='text-text-secondary'>Trip not found</p>
			</div>
		);
	}

	const checkedCount = tripItems?.filter((item) => item.isChecked).length || 0;
	const totalCount = tripItems?.length || 0;
	const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

	return (
		<div className='px-5 pt-7 pb-8 animate-fade-in'>
			<div className='mb-6'>
				<button onClick={() => navigate(tripDetailPath(tripId!))} className='text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3'>
					<ArrowLeft className='w-4 h-4' />
					Update Shopping List
				</button>
				<h1 className='font-display text-[28px] font-extrabold text-navy tracking-tight'>{trip.name}</h1>
			</div>

			<div className='mb-6'>
				<button
					onClick={handleCompleteTrip}
					disabled={completeMutation.isPending}
					className='w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors flex items-center justify-center'
				>
					{completeMutation.isPending ? <Spinner /> : 'Complete Trip'}
				</button>
			</div>

			<div className='mb-6'>
				{/* Progress bar */}
				<div>
					<div className='flex justify-between text-sm mb-2'>
						<span className='text-text-tertiary font-semibold'>
							{checkedCount} of {totalCount} items
						</span>
						<span className='text-teal font-extrabold'>{progressPercent}%</span>
					</div>
					<div className='w-full bg-bg-warm rounded-full h-2 overflow-hidden'>
						<div className='bg-gradient-to-r from-teal to-teal-light h-2 rounded-full transition-all duration-500' style={{ width: `${progressPercent}%` }} />
					</div>
				</div>
			</div>

			<div className='mb-4'>
				<SectionHeader title={`Shopping List (${totalCount})`} />
			</div>

			{groupedItems.length > 0 ? (
				<div className='mb-6'>
					{groupedItems.map(([storeName, storeItems]) => {
						const checkedCount = storeItems.filter((item) => item.isChecked).length;
						return (
							<StoreAccordion
								key={storeName}
								storeName={storeName}
								isExpanded={isExpanded(storeName)}
								onToggle={() => toggleStore(storeName)}
								itemCount={storeItems.length}
								checkedCount={checkedCount}
							>
								<div className='space-y-2'>
									{storeItems.map((item) => (
										<TripItemRow
											key={item.id}
											tripItem={item}
											itemName={item.itemName}
											stores={stores || []}
											storeDisplayNames={storeDisplayNames}
											onUpdate={handleUpdateItem}
											onDelete={handleDeleteItem}
											isUpdating={updateMutation.isPending}
											showCheckbox
											onToggleCheck={(id, checked) => handleToggleItem(id, checked)}
										/>
									))}
								</div>
							</StoreAccordion>
						);
					})}
				</div>
			) : (
				<EmptyState icon={ShoppingCart} title='No items in this trip' />
			)}

			{showCompleteConfirm && (
				<ConfirmDialog
					title='Hold on!'
					message='It looks like you may have missed some items. Are you sure you want to complete your trip?'
					confirmLabel='Complete Anyway'
					cancelLabel='Keep Shopping'
					onConfirm={() => {
						setShowCompleteConfirm(false);
						doCompleteTrip();
					}}
					onCancel={() => setShowCompleteConfirm(false)}
					isPending={completeMutation.isPending}
				/>
			)}
		</div>
	);
};
