// ABOUTME: Extension methods for IObservable to async enumerable conversion
// ABOUTME: Enables SSE streaming from reactive observables

using System.Runtime.CompilerServices;

namespace AGDevX.Cart.Shared.Extensions;

public static class ObservableExtensions
{
    public static async IAsyncEnumerable<T> ToAsyncEnumerable<T>(this IObservable<T> observable, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var queue = new System.Collections.Concurrent.BlockingCollection<T>();
        Exception? error = null;

        using var subscription = observable.Subscribe
        (
            onNext: item => queue.Add(item),
            onError: ex =>
            {
                error = ex;
                queue.CompleteAdding();
            },
            onCompleted: () =>
            {
                queue.CompleteAdding();
            }
        );

        using var _ = cancellationToken.Register(() => queue.CompleteAdding());

        while (!queue.IsCompleted)
        {
            if (queue.TryTake(out var item, Timeout.Infinite, cancellationToken))
            {
                yield return item;
            }
        }

        if (error != null)
        {
            throw error;
        }
    }
}