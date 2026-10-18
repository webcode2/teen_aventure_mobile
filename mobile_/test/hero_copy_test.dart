import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/providers/hero_copy.dart';
import 'package:teen_aventure/services/api_client.dart';

void main() {
  test('CMS navigation, home and quest copy survive an offline restart', () async {
    SharedPreferences.setMockInitialValues({
      'cms_app_text': '{"home":{"todayTitle":"This week"},"navigation":{"home":"Start"},"legalLinks":{"privacyUrl":"/p/current-privacy"}}',
      'cms_quest_copy': '{"title":"Our journey","myQuest":"Continue"}',
    });
    final prefs = await SharedPreferences.getInstance();
    final controller = HeroCopyController(await ApiClient.create(), prefs);
    expect(controller.text('home', 'todayTitle', 'Today'), 'This week');
    expect(controller.text('navigation', 'home', 'Home'), 'Start');
    expect(controller.text('legalLinks', 'privacyUrl', '/p/privacy-policy'), '/p/current-privacy');
    expect(controller.text('home', 'missing', 'Fallback'), 'Fallback');
    expect(controller.questCopy['title'], 'Our journey');
    controller.dispose();
  });
  test('keeps the cached hero until a database payload arrives', () async {
    SharedPreferences.setMockInitialValues({
      HeroCopyCache.key: '{"greeting":"Hey, cached!","tagline":"Last line","abiUrl":"/api/v1/content/files/abi-1.png","zackUrl":"","abiFile":"/tmp/abi.png"}',
    });
    final prefs = await SharedPreferences.getInstance();
    final cached = HeroCopyCache.read(prefs);
    expect(cached.greeting, 'Hey, cached!');
    expect(cached.abiUrl, '/api/v1/content/files/abi-1.png');
    expect(cached.abiFile, '/tmp/abi.png');

    expect(HeroCopy.resolve(null, cached).greeting, 'Hey, cached!');
    expect(HeroCopy.resolve({'announcement': {}}, cached).tagline, 'Last line');
    expect(
      HomeAnnouncement.resolve({'announcement': {}}, HomeAnnouncement.fallback).enabled,
      isTrue,
    );

    final fresh = HeroCopy.resolve({
      'hero': {
        'greeting': 'Hey, Explorer!',
        'tagline': 'New line',
        'abiUrl': '/api/v1/content/files/abi-2.png',
        'zackUrl': '/api/v1/content/files/zack-2.png',
      },
    }, cached);
    expect(fresh.greeting, 'Hey, Explorer!');
    expect(fresh.tagline, 'New line');
    expect(fresh.abiUrl, '/api/v1/content/files/abi-2.png');
    expect(fresh.zackUrl, '/api/v1/content/files/zack-2.png');
    expect(fresh.abiFile, '/tmp/abi.png');

    await HeroCopyCache.write(prefs, fresh);
    expect(HeroCopyCache.read(prefs).tagline, 'New line');
  });

  test('blank greeting stays on the last value and an empty image url clears it', () {
    const current = HeroCopy(
      greeting: 'Hey, cached!',
      tagline: 'Last line',
      abiUrl: '/old.png',
    );
    final next = HeroCopy.resolve({
      'hero': {'greeting': '  ', 'tagline': '', 'abiUrl': '', 'zackUrl': ''},
    }, current);
    expect(next.greeting, 'Hey, cached!');
    expect(next.tagline, 'Last line');
    expect(next.abiUrl, isEmpty);
    expect(next.zackUrl, isEmpty);
  });

  test('a hidden announcement stays hidden and a blank line stays blank', () {
    const current = HomeAnnouncement(
      enabled: true,
      badge: 'NEW',
      text: 'Old line',
      actionLabel: 'Go',
    );
    final hidden = HomeAnnouncement.resolve({
      'announcement': {'enabled': false, 'badge': 'LIVE', 'text': '', 'actionLabel': 'Open week'},
    }, current);
    expect(hidden.enabled, isFalse);
    expect(hidden.visible, isFalse);
    expect(hidden.badge, 'LIVE');
    expect(hidden.text, isEmpty);
    expect(hidden.actionLabel, 'Open week');

    expect(HomeAnnouncement.resolve({'hero': {}}, current).text, 'Old line');
  });
}
