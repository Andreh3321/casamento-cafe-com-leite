import { describe, expect, it } from 'vitest';
import { budgetTotals, weddingBudget } from '@/lib/wedding-budget';
import { initialWorkspace, normalizeWorkspace } from '@/lib/workspace';

describe('Uploaded wedding budget', () => {
  it('matches the source planned amount', () => expect(budgetTotals(weddingBudget).planned).toBe(48243));
  it('matches the source contracted amount', () => expect(budgetTotals(weddingBudget).contracted).toBe(18000));
  it('matches the source paid amount', () => expect(budgetTotals(weddingBudget).paid).toBe(2077));
  it('calculates balance as contracted minus paid', () => expect(budgetTotals(weddingBudget).balance).toBe(15923));
  it('uses photography row instead of outdated footer', () => expect(weddingBudget.find(i => i.name === 'Foto e vídeo')?.planned).toBe(7000));
});
describe('Separate planning lists', () => {
  it('keeps her and his guest lists distinct', () => {
    const guests = [{ id: '1', name: 'A', side: 'Ela', group: '', contact: '', status: 'A convidar', notes: '' }, { id: '2', name: 'B', side: 'Ele', group: '', contact: '', status: 'A convidar', notes: '' }];
    expect(normalizeWorkspace({ guests }).guests.filter(g => g.side === 'Ela').map(g => g.id)).toEqual(['1']);
  });
  it('does not add event expenses to wedding totals', () => {
    const data = normalizeWorkspace({ ...initialWorkspace, eventExpenses: [{ id: 'e', event: 'Jantar de noivado', name: 'Jantar', planned: 100, contracted: 50, paid: 10, dueDate: '', owner: '' }] });
    expect(budgetTotals(data.budgetCategories).planned).toBe(48243);
    expect(budgetTotals(data.eventExpenses).planned).toBe(100);
  });
  it('preserves old data while adding empty new lists', () => {
    const data = normalizeWorkspace({ tasks: [], notes: { decisions: 'Decisão existente' } });
    expect(data.notes.decisions).toBe('Decisão existente');
    expect(data.guests).toEqual([]);
    expect(data.houseItems).toEqual([]);
  });
  it('adds room name, couple rating and notes to resorts saved before they existed', () => {
    const old = { id: 'resort-01', name: 'Grand Bávaro', hydro: 'Confirmada', favorite: true };
    const [resort] = normalizeWorkspace({ resorts: [old] }).resorts;
    expect(resort?.roomName).toBe('');
    expect(resort?.coupleRating).toBeNull();
    expect(resort?.coupleNotes).toBe('');
    expect(resort?.name).toBe('Grand Bávaro');
  });
  it('keeps the couple rating and notes once saved', () => {
    const saved = { id: 'resort-01', name: 'Grand Bávaro', roomName: 'Platinum Suite', coupleRating: 9, coupleNotes: 'Adoramos a praia' };
    const [resort] = normalizeWorkspace({ resorts: [saved] }).resorts;
    expect(resort?.coupleRating).toBe(9);
    expect(resort?.coupleNotes).toBe('Adoramos a praia');
  });
});