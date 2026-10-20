import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/services/read_cache.dart';

void main() {
  test('published curriculum is cached and personal progress stays per account', () {
    var now = 1000000;
    final store = MemoryReadCacheStore();
    final cache = AppReadCache(store, clock: () => now);

    expect(ReadCachePolicy.freshFor('/api/v1/teen-quest/weeks'), const Duration(minutes: 15));
    expect(ReadCachePolicy.freshFor('/api/teen-quest/weeks/4/progress'), const Duration(seconds: 90));
    expect(ReadCachePolicy.freshFor('/api/v1/invites/token'), isNull);
    expect(ReadCachePolicy.isPublished('/api/v1/teen-quest/weeks/4/progress'), isFalse);

    final week = cache.entryKey(path: '/api/v1/teen-quest/weeks/4', query: const {}, scope: 'shared');
    cache.save(week, {'title': 'Bible Class'});
    expect(cache.fresh(week, const Duration(minutes: 15)), {'title': 'Bible Class'});

    final childA = cache.entryKey(
      path: '/api/v1/teen-quest/current',
      query: const {'childId': 'a'},
      scope: 'p:account-a',
    );
    final childB = cache.entryKey(
      path: '/api/v1/teen-quest/current',
      query: const {'childId': 'b'},
      scope: 'p:account-b',
    );
    cache.save(childA, {'weekNumber': 2});
    cache.save(childB, {'weekNumber': 5});
    expect(cache.fresh(childA, const Duration(seconds: 90)), {'weekNumber': 2});
    expect(cache.fresh(childB, const Duration(seconds: 90)), {'weekNumber': 5});

    cache.invalidateScope('p:account-a');
    expect(cache.fresh(childA, const Duration(seconds: 90)), isNull);
    expect(cache.fresh(childB, const Duration(seconds: 90)), {'weekNumber': 5});
    expect(cache.fresh(week, const Duration(minutes: 15)), {'title': 'Bible Class'});

    now += const Duration(minutes: 20).inMilliseconds;
    expect(cache.fresh(week, const Duration(minutes: 15)), isNull);
    expect(cache.stale(week, const Duration(days: 7)), {'title': 'Bible Class'});

    final reopened = AppReadCache(store, clock: () => now);
    expect(reopened.stale(week, const Duration(days: 7)), {'title': 'Bible Class'});
  });

  test('disk history stays bounded', () {
    final store = MemoryReadCacheStore();
    final cache = AppReadCache(store, clock: () => 10);
    for (var index = 0; index < 45; index++) {
      cache.save('shared|/teen-quest/weeks/$index|', {'index': index});
    }
    expect(store.getStringList(AppReadCache.manifestKey).length, AppReadCache.maxEntries);
    expect(cache.fresh('shared|/teen-quest/weeks/0|', const Duration(minutes: 15)), isNull);
    expect(cache.fresh('shared|/teen-quest/weeks/44|', const Duration(minutes: 15)), {'index': 44});
  });
}
