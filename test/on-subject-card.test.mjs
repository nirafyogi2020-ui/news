import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOnSubjectCard } from '../src/front-rules.mjs';

test('automatic briefings must be about a disaster, roads or the weather', () => {
  // Off the site: no disaster anywhere in the story (23 Nov 2026 Today feed).
  assert.ok(!isOnSubjectCard('नुवाकोटका किसान जेठोबुढो धान खेतीमा आकर्षित',
    'नुवाकोटको दुप्चेश्वर गाउँपालिकामा पोखरेली जेठोबुढो धान खेतीप्रति किसानको आकर्षण बढ्दै गएको छ।'));
  assert.ok(!isOnSubjectCard('Chhath preserves indigenous knowledge: VP Yadav',
    'KATHMANDU: Vice President Ram Sahaya Prasad Yadav has said that the Chhath festival is a living tradition.'));
  assert.ok(!isOnSubjectCard('Shark Tank Nepal Season 2 to premiere on December 2', 'The show returns.'));
  // Another country's disaster stays off, as on the front page.
  assert.ok(!isOnSubjectCard('मध्य पेरुमा ६.७ म्याग्निच्युडको भूकम्प, क्षतिको विवरण सङ्कलन हुँदै', 'पेरुमा भूकम्प गएको छ।'));

  // On the site.
  assert.ok(isOnSubjectCard('Dry landslide blocks Kaligandaki corridor in Gulmi', ''));
  assert.ok(isOnSubjectCard('BP Highway obstructed', 'Traffic has stopped.'));
  assert.ok(isOnSubjectCard('Partly cloudy forecast for Madhesh and Koshi Provinces', 'Westerly winds.'));
  assert.ok(isOnSubjectCard('Water supply resumes in Beni after a month halt',
    'Water supply in Beni resumed a month after the flood damaged the intake.'));
});
