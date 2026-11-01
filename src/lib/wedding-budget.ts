// Source: Orç._Café_com_Leite.xlsx, Orçamento rows 5–14. Base sheet takes precedence over Totais.
export const weddingBudget = [
  { id: 'budget-excel-5', name: 'Convites e papelaria', planned: 500, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-6', name: 'Música e entretenimento', planned: 500, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-7', name: 'Transporte e hospedagem', planned: 0, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-8', name: 'Outros', planned: 500, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-9', name: 'Trajes e beleza', planned: 5000, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-10', name: 'Local e cerimônia', planned: 18693, contracted: 18000, paid: 2077, notes: '' },
  { id: 'budget-excel-11', name: 'Decoração e flores', planned: 0, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-12', name: 'Buffet e bebidas', planned: 16050, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-13', name: 'Foto e vídeo', planned: 7000, contracted: 0, paid: 0, notes: '' },
  { id: 'budget-excel-14', name: 'Lua de Mel', planned: 0, contracted: 0, paid: 0, notes: 'Valor a ser pago somente na estadia' },
];

export function budgetTotals(items: { planned: number; contracted: number; paid: number }[]) {
  const totals = items.reduce((a, b) => ({ planned: a.planned + b.planned, contracted: a.contracted + b.contracted, paid: a.paid + b.paid }), { planned: 0, contracted: 0, paid: 0 });
  return { ...totals, balance: totals.contracted - totals.paid, remaining: totals.planned - totals.contracted };
}