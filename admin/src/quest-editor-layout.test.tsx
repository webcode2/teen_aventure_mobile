import fs from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuestEditorPage } from './pages-content';
import { api } from './api';
vi.mock('./api', () => ({ api: vi.fn() }));
const week = { weekNumber: 1, title: 'Week 1: Genesis 1–8', scripture: 'Genesis 1:1 — In the beginning God created heaven and the earth.', declarationText: 'I declare: The Word of God guides my steps, fills my heart with faith, and gives me victory!', content: 'In the beginning, God created the heavens and the earth.\n\nThis week, explore how God brings order, purpose, and life into the world. Read Genesis 1–8 and reflect on what it means to be made in His image.\n\nAsk yourself: Where can I reflect God’s goodness in my family, friendships, and everyday choices?', videos: [], gameType: 'PUZZLE' };
beforeEach(() => {
  localStorage.clear();
  vi.mocked(api).mockImplementation(async path => path === '/api/teen-quest/weeks/1' ? week : path === '/api/teen-quest/weeks' ? [week] : { versions: [] });
});
afterEach(cleanup);
function open() { return render(<MemoryRouter initialEntries={['/app/dashboard/quests/1']}><Routes><Route path="/app/dashboard/quests/:week" element={<QuestEditorPage />} /></Routes></MemoryRouter>); }
it('shows a focused writing area and accessible week details', async () => {
  open();
  await screen.findByRole('heading', { name: week.title });
  expect(screen.getByRole('textbox', { name: 'Teaching & reflection' }).getAttribute('rows')).toBe('15');
  expect(screen.getByRole('textbox', { name: 'Lesson title' })).toBeTruthy();
  expect(within(screen.getByRole('complementary', { name: 'Week details' })).getByRole('spinbutton', { name: 'Week number' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Lesson' }).getAttribute('aria-current')).toBe('step');
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  if (process.env.QUEST_EDITOR_PREVIEW_DIR) {
    fs.mkdirSync(process.env.QUEST_EDITOR_PREVIEW_DIR, { recursive: true });
    // Keep live form values in the static visual QA snapshot.
    document.querySelectorAll('textarea').forEach(node => { node.textContent = node.value; });
    document.querySelectorAll('input').forEach(node => { node.setAttribute('value', node.value); });
    fs.writeFileSync(`${process.env.QUEST_EDITOR_PREVIEW_DIR}/body.html`, document.body.innerHTML);
  }
});
it('keeps edited lesson content when moving between steps and saving a draft', async () => {
  open(); await screen.findByRole('heading', { name: week.title });
  await userEvent.type(screen.getByRole('textbox', { name: 'Teaching & reflection' }), '\nMy new reflection.');
  await userEvent.click(screen.getByRole('button', { name: /Next: Videos/ }));
  expect(screen.getByRole('button', { name: 'Videos' }).getAttribute('aria-current')).toBe('step');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect((screen.getByRole('textbox', { name: 'Teaching & reflection' }) as HTMLTextAreaElement).value).toContain('My new reflection.');
  await waitFor(() => expect(localStorage.getItem('tba-quest-draft:1')).toContain('My new reflection.'));
});
