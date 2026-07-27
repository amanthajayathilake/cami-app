import { createDataSource } from './data-source';
import { CustomerRequest } from './requests/customer-request.entity';
import { RequestNote } from './requests/request-note.entity';

const MESSAGES = [
  'I need help changing my payment method',
  'Our billing invoice looks wrong this month',
  'Can someone walk me through the sales pricing tiers?',
  'The dashboard is broken after the last deploy',
  'Interested in a demo for our salon booking flow',
  'Refund did not arrive after cancellation',
  'Support ticket: login error on Safari',
  'Looking to upgrade our plan next quarter',
];

const NOTE_BODIES = [
  'Customer called in.',
  'Waiting on screenshot.',
  'Followed up by email.',
  'Escalated to billing ops.',
  'Reproduced locally.',
];

async function main() {
  const ds = createDataSource();
  await ds.initialize();

  const requests = ds.getRepository(CustomerRequest);
  const notes = ds.getRepository(RequestNote);

  const existing = await requests.count();
  if (existing >= 40) {
    // eslint-disable-next-line no-console
    console.log(`Seed skipped (${existing} requests already present)`);
    await ds.destroy();
    return;
  }

  for (let i = 0; i < 48; i += 1) {
    const message = `${MESSAGES[i % MESSAGES.length]} (#${i + 1})`;
    const saved = await requests.save(
      requests.create({
        message,
        status: i % 5 === 0 ? 'resolved' : i % 3 === 0 ? 'in_progress' : 'open',
        category: null,
        confidence: null,
      }),
    );

    const noteCount = 3 + (i % 3);
    for (let n = 0; n < noteCount; n += 1) {
      await notes.save(
        notes.create({
          requestId: saved.id,
          body: `${NOTE_BODIES[n % NOTE_BODIES.length]} [${i + 1}.${n + 1}]`,
          authorName: n % 2 === 0 ? 'Alex' : 'Sam',
        }),
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
