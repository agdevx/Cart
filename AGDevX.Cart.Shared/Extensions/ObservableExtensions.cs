// ABOUTME: Extension methods for IObservable to async enumerable conversion
// ABOUTME: Enables SSE streaming from reactive observables

using System.Reactive.Linq;

namespace AGDevX.Cart.Shared.Extensions;

public static class ObservableExtensions
{
    public static async IAsyncEnumerable<T> ToAsyncEnumerable<T>(this IObservable<T> observable)
    {
        var enumerable = observable.ToAsyncEnumerable();
        await foreach (var item in enumerable)
        {
            yield return item;
        }
    }
}
