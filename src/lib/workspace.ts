import * as XLSX from "xlsx";

export type Status = "A fazer" | "Em andamento" | "Concluído";
export type Priority = "Baixa" | "Média" | "Alta";
export type HydroStatus = "Confirmada" | "A confirmar" | "Não";

export type DateReminder = {
  id: string;
  date: string;
  title: string;
  remindOn: string;
  owner: string;
  status: Status;
  notes: string;
};

export type WeddingTask = {
  id: string;
  title: string;
  dueDate: string;
  owner: string;
  priority: Priority;
  status: Status;
  notes: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  planned: number;
  contracted: number;
  paid: number;
};

export type Payment = {
  id: string;
  dueDate: string;
  item: string;
  amount: number;
  paidOn: string;
  method: string;
  status: "Pendente" | "Pago";
  receipt: string;
};

export type Supplier = {
  id: string;
  service: string;
  supplier: string;
  contact: string;
  url: string;
  amount: number;
  notes: string;
};

export type FlightOption = {
  id: string;
  route: string;
  airline: string;
  date: string;
  duration: string;
  priceBRL: number | null;
  notes: string;
  favorite: boolean;
};

export type DocumentItem = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: Status;
  notes: string;
};

export type Resort = {
  id: string;
  region: string;
  destination: string;
  name: string;
  profile: string;
  suite: string;
  hydro: HydroStatus;
  hotelBRL: number | null;
  hotelUSD: number | null;
  reference: string;
  bookingRating: number | null;
  resortRating: number | null;
  roomRating: number | null;
  romanceRating: number | null;
  budgetRating: number | null;
  styleFit: string;
  bookingUrl: string;
  favorite: boolean;
  ranking: number | null;
};

export type WorkspaceData = {
  weddingDate: string;
  weddingLocation: string;
  guestEstimate: string;
  tripMonth: string;
  tripDates: string;
  travelers: number;
  nights: number;
  lodgingBudgetUSD: number;
  nextImportantDate: string;
  dates: DateReminder[];
  tasks: WeddingTask[];
  budgetCategories: BudgetCategory[];
  payments: Payment[];
  suppliers: Supplier[];
  flights: FlightOption[];
  documents: DocumentItem[];
  resorts: Resort[];
  notes: {
    decisions: string;
    ideas: string;
    pending: string;
  };
};

const resortSeeds: Array<Partial<Resort> & Pick<Resort, "name">> = [
  {
    name: "Barceló Maya Riviera",
    region: "Caribe",
    destination: "México",
    profile: "Adults only · all-inclusive",
    suite: "Junior Suite / hidro a confirmar",
    hydro: "A confirmar",
    hotelUSD: null,
    reference: "Cotação exata 04–08/07/2027",
    bookingRating: 9,
    resortRating: 9,
    roomRating: 7,
    romanceRating: 9,
    budgetRating: 6,
    styleFit: "Romântico e completo",
  },
  {
    name: "Iberostar Selection Praia do Forte Penthouse",
    region: "Brasil",
    destination: "Praia do Forte",
    profile: "Praia · all-inclusive",
    suite: "Penthouse",
    hydro: "A confirmar",
    hotelUSD: null,
    reference: "Cotação exata 04–08/07/2027",
    bookingRating: 9,
    resortRating: 9,
    roomRating: 8,
    romanceRating: 9,
    budgetRating: 5,
    styleFit: "Conforto com charme",
  },
  {
    name: "Iberostar Waves Bahia Relax Suite",
    region: "Brasil",
    destination: "Praia do Forte",
    profile: "Praia · all-inclusive",
    suite: "Relax Suite",
    hydro: "A confirmar",
    hotelUSD: null,
    reference: "Cotação exata 04–08/07/2027",
    bookingRating: 8,
    resortRating: 8,
    roomRating: 7,
    romanceRating: 8,
    budgetRating: 7,
    styleFit: "Equilíbrio e praticidade",
  },
  {
    name: "Grand Palladium Imbassaí Junior Suite",
    region: "Brasil",
    destination: "Imbassaí",
    profile: "Praia · all-inclusive",
    suite: "Junior Suite",
    hydro: "A confirmar",
    hotelUSD: null,
    reference: "Cotação exata 04–08/07/2027",
    bookingRating: 8,
    resortRating: 8,
    roomRating: 7,
    romanceRating: 8,
    budgetRating: 7,
    styleFit: "Natureza e descanso",
  },
  {
    name: "Princess Grand Jamaica Hydromassage Suite",
    region: "Caribe",
    destination: "Jamaica",
    profile: "All-inclusive · praia",
    suite: "Hydromassage Suite",
    hydro: "Confirmada",
    hotelUSD: null,
    reference: "Cotação exata 04–08/07/2027",
    bookingRating: 8,
    resortRating: 9,
    roomRating: 9,
    romanceRating: 9,
    budgetRating: 5,
    styleFit: "Hidro comprovada",
  },
  {
    name: "Grand Bávaro Princess – Honeymoon Platinum Suite",
    region: "Caribe",
    destination: "Punta Cana",
    profile: "Benchmark · all-inclusive",
    suite: "Honeymoon Platinum Suite",
    hydro: "A confirmar",
    hotelUSD: null,
    reference: "Confirmar por escrito se há jatos/hidromassagem",
    bookingRating: 8,
    resortRating: 8,
    roomRating: 6,
    romanceRating: 8,
    budgetRating: 7,
    styleFit: "Benchmark do casal",
  },
];

const makeId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

export function calculateHoneymoonIndex(resort: Resort) {
  const scores = [resort.bookingRating, resort.resortRating, resort.roomRating, resort.romanceRating, resort.budgetRating];
  if (scores.some(score => score === null || score === undefined)) return null;
  const roomAdjustment = resort.hydro === "Confirmada" ? 1 : resort.hydro === "A confirmar" ? 0.75 : 0.6;
  const adjustedRoom = (resort.roomRating ?? 0) * roomAdjustment;
  return Number(((resort.resortRating! * 0.4 + adjustedRoom * 0.35 + resort.romanceRating! * 0.15 + resort.budgetRating! * 0.1)).toFixed(1));
}

export function createInitialResorts() {
  return Array.from({ length: 48 }, (_, index): Resort => {
    const seed = resortSeeds[index];
    return {
      id: makeId("resort", index),
      region: seed?.region ?? "A definir",
      destination: seed?.destination ?? "A definir",
      name: seed?.name ?? `Opção de resort ${String(index + 1).padStart(2, "0")}`,
      profile: seed?.profile ?? "Adicionar perfil",
      suite: seed?.suite ?? "Adicionar suíte/categoria",
      hydro: seed?.hydro ?? "A confirmar",
      hotelBRL: seed?.hotelBRL ?? null,
      hotelUSD: seed?.hotelUSD ?? null,
      reference: seed?.reference ?? "Aguardando cotação exata 04–08/07/2027",
      bookingRating: seed?.bookingRating ?? null,
      resortRating: seed?.resortRating ?? null,
      roomRating: seed?.roomRating ?? null,
      romanceRating: seed?.romanceRating ?? null,
      budgetRating: seed?.budgetRating ?? null,
      styleFit: seed?.styleFit ?? "A preencher",
      bookingUrl: seed?.bookingUrl ?? "",
      favorite: index === 4,
      ranking: index === 4 ? 1 : null,
    };
  });
}

export const initialWorkspace: WorkspaceData = {
  weddingDate: "2027-07-03",
  weddingLocation: "A definir",
  guestEstimate: "120 a 150",
  tripMonth: "Julho de 2027",
  tripDates: "04–08/07/2027 · datas flexíveis",
  travelers: 2,
  nights: 4,
  lodgingBudgetUSD: 1600,
  nextImportantDate: "A definir",
  dates: [
    {
      id: "date-1",
      date: "2027-07-03",
      title: "Data do casamento",
      remindOn: "2027-06-03",
      owner: "Nós dois",
      status: "A fazer",
      notes: "",
    },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Definir local do casamento",
      dueDate: "",
      owner: "Nós dois",
      priority: "Alta",
      status: "A fazer",
      notes: "Comparar propostas e disponibilidade.",
    },
    {
      id: "task-2",
      title: "Pedir confirmação escrita da hidro",
      dueDate: "",
      owner: "Nós dois",
      priority: "Média",
      status: "Em andamento",
      notes: "Começar pelo benchmark Grand Bávaro Princess.",
    },
  ],
  budgetCategories: [
    { id: "budget-1", name: "Espaço", planned: 0, contracted: 0, paid: 0 },
    { id: "budget-2", name: "Buffet", planned: 0, contracted: 0, paid: 0 },
    { id: "budget-3", name: "Foto e vídeo", planned: 0, contracted: 0, paid: 0 },
    { id: "budget-4", name: "Decoração", planned: 0, contracted: 0, paid: 0 },
  ],
  payments: [],
  suppliers: [],
  flights: [
    { id: "flight-1", route: "São Paulo → destino", airline: "A definir", date: "", duration: "", priceBRL: null, notes: "Comparar ida e volta para 04–08/07/2027.", favorite: false },
  ],
  documents: [
    { id: "document-1", title: "Passaportes válidos", owner: "Nós dois", dueDate: "", status: "A fazer", notes: "Conferir validade antes de fechar a viagem." },
    { id: "document-2", title: "Verificar necessidade de visto", owner: "Nós dois", dueDate: "", status: "A fazer", notes: "Destino depende do resort escolhido." },
    { id: "document-3", title: "Seguro viagem", owner: "Nós dois", dueDate: "", status: "A fazer", notes: "Adicionar depois da compra dos voos." },
  ],
  resorts: createInitialResorts(),
  notes: {
    decisions: "Ainda não há decisões registradas.",
    ideas: "Criar uma viagem que pareça uma pausa de verdade.",
    pending: "Escolher o local e fechar o estilo da lua de mel.",
  },
};

export function normalizeWorkspace(value: unknown): WorkspaceData {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<WorkspaceData>;
  return {
    ...initialWorkspace,
    ...raw,
    dates: Array.isArray(raw.dates) ? raw.dates : initialWorkspace.dates,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : initialWorkspace.tasks,
    budgetCategories: Array.isArray(raw.budgetCategories) ? raw.budgetCategories : initialWorkspace.budgetCategories,
    payments: Array.isArray(raw.payments) ? raw.payments : initialWorkspace.payments,
    suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : initialWorkspace.suppliers,
    flights: Array.isArray(raw.flights) ? raw.flights : initialWorkspace.flights,
    documents: Array.isArray(raw.documents) ? raw.documents : initialWorkspace.documents,
    resorts: Array.isArray(raw.resorts) && raw.resorts.length > 0 ? raw.resorts : initialWorkspace.resorts,
    notes: { ...initialWorkspace.notes, ...(raw.notes ?? {}) },
  };
}

export function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
}

export function formatDate(date: string) {
  if (!date) return "Sem prazo";
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(parsed).replace(" de ", " ");
}

export function exportResorts(resorts: Resort[]) {
  const rows = resorts.map(resort => ({
    ID: resort.id,
    Região: resort.region,
    Destino: resort.destination,
    "Nome do resort – clique para Booking": resort.name,
    Perfil: resort.profile,
    "Suíte/categoria analisada": resort.suite,
    "Hidro na suíte?": resort.hydro,
    "Hotel 4 noites (R$)": resort.hotelBRL ?? "",
    "Hotel 4 noites (US$)": resort.hotelUSD ?? "",
    "Preço de referência / período": resort.reference,
    "Nota Booking": resort.bookingRating ?? "",
    "Nota resort": resort.resortRating ?? "",
    "Nota quarto": resort.roomRating ?? "",
    "Nota romantismo": resort.romanceRating ?? "",
    "Nota orçamento": resort.budgetRating ?? "",
    "Índice Lua de Mel": calculateHoneymoonIndex(resort) ?? "",
    "Aderência ao estilo do casal": resort.styleFit,
    "Link editável": resort.bookingUrl,
    Favorito: resort.favorite ? "Sim" : "Não",
    Ranking: resort.ranking ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Resorts");
  XLSX.writeFile(book, "nossa-casamento-resorts.xlsx");
}

export function exportWorkspace(data: WorkspaceData) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ["Campo", "Valor"],
    ["Data do casamento", data.weddingDate],
    ["Local do casamento", data.weddingLocation],
    ["Convidados estimados", data.guestEstimate],
    ["Orçamento total", data.budgetCategories.reduce((sum, item) => sum + item.planned, 0)],
    ["Total contratado", data.budgetCategories.reduce((sum, item) => sum + item.contracted, 0)],
    ["Total pago", data.budgetCategories.reduce((sum, item) => sum + item.paid, 0)],
    ["Próximo prazo importante", data.nextImportantDate],
    ["Mês da viagem", data.tripMonth],
    ["Datas da viagem", data.tripDates],
    ["Viajantes", data.travelers],
    ["Noites", data.nights],
    ["Teto de hospedagem (US$)", data.lodgingBudgetUSD],
  ]), "Configuração");
  const resorts = data.resorts.map(resort => ({
    ID: resort.id,
    Região: resort.region,
    Destino: resort.destination,
    "Nome do resort – clique para Booking": resort.name,
    Perfil: resort.profile,
    "Suíte/categoria analisada": resort.suite,
    "Hidro na suíte?": resort.hydro,
    "Hotel 4 noites (R$)": resort.hotelBRL ?? "",
    "Hotel 4 noites (US$)": resort.hotelUSD ?? "",
    "Preço de referência / período": resort.reference,
    "Nota Booking": resort.bookingRating ?? "",
    "Nota resort": resort.resortRating ?? "",
    "Nota quarto": resort.roomRating ?? "",
    "Nota romantismo": resort.romanceRating ?? "",
    "Nota orçamento": resort.budgetRating ?? "",
    "Índice Lua de Mel": calculateHoneymoonIndex(resort) ?? "",
    "Aderência ao estilo do casal": resort.styleFit,
    "Link editável": resort.bookingUrl,
    Favorito: resort.favorite ? "Sim" : "Não",
    Ranking: resort.ranking ?? "",
  }));
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(resorts), "Resorts");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data.tasks), "Tarefas");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data.dates), "Datas");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data.budgetCategories), "Orçamento");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data.payments), "Pagamentos");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data.suppliers), "Fornecedores");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data.flights), "Voos");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data.documents), "Documentos");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ["Campo", "Conteúdo"],
    ["Decisões importantes", data.notes.decisions],
    ["Preferências e ideias", data.notes.ideas],
    ["Pendências para conversar", data.notes.pending],
  ]), "Notas");
  XLSX.writeFile(book, "nossa-casamento-workspace.xlsx");
}

const getString = (row: Record<string, unknown>, key: string) => String(row[key] ?? "").trim();
const getNumber = (row: Record<string, unknown>, key: string) => {
  const value = Number(String(row[key] ?? "").replace(",", "."));
  return Number.isFinite(value) && String(row[key] ?? "").trim() !== "" ? value : null;
};

const hasValue = (row: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(row, key) && String(row[key] ?? "").trim() !== "";

export async function importResorts(file: File, current: Resort[]) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  return current.map((resort, index) => {
    const row = rows.find(candidate => hasValue(candidate, "ID") && getString(candidate, "ID") === resort.id)
      ?? rows.find(candidate => hasValue(candidate, "Nome do resort – clique para Booking") && getString(candidate, "Nome do resort – clique para Booking") === resort.name)
      ?? rows[index];
    if (!row) return resort;
    const hydro = getString(row, "Hidro na suíte?") as HydroStatus;
    return {
      ...resort,
      region: hasValue(row, "Região") ? getString(row, "Região") : resort.region,
      destination: hasValue(row, "Destino") ? getString(row, "Destino") : resort.destination,
      name: hasValue(row, "Nome do resort – clique para Booking") ? getString(row, "Nome do resort – clique para Booking") : resort.name,
      profile: hasValue(row, "Perfil") ? getString(row, "Perfil") : resort.profile,
      suite: hasValue(row, "Suíte/categoria analisada") ? getString(row, "Suíte/categoria analisada") : resort.suite,
      hydro: hasValue(row, "Hidro na suíte?") && ["Confirmada", "A confirmar", "Não"].includes(hydro) ? hydro : resort.hydro,
      hotelBRL: hasValue(row, "Hotel 4 noites (R$)") ? getNumber(row, "Hotel 4 noites (R$)") : resort.hotelBRL,
      hotelUSD: hasValue(row, "Hotel 4 noites (US$)") ? getNumber(row, "Hotel 4 noites (US$)") : resort.hotelUSD,
      reference: hasValue(row, "Preço de referência / período") ? getString(row, "Preço de referência / período") : resort.reference,
      bookingRating: hasValue(row, "Nota Booking") ? getNumber(row, "Nota Booking") : resort.bookingRating,
      resortRating: hasValue(row, "Nota resort") ? getNumber(row, "Nota resort") : resort.resortRating,
      roomRating: hasValue(row, "Nota quarto") ? getNumber(row, "Nota quarto") : resort.roomRating,
      romanceRating: hasValue(row, "Nota romantismo") ? getNumber(row, "Nota romantismo") : resort.romanceRating,
      budgetRating: hasValue(row, "Nota orçamento") ? getNumber(row, "Nota orçamento") : resort.budgetRating,
      styleFit: hasValue(row, "Aderência ao estilo do casal") ? getString(row, "Aderência ao estilo do casal") : resort.styleFit,
      bookingUrl: hasValue(row, "Link editável") ? getString(row, "Link editável") : resort.bookingUrl,
      favorite: hasValue(row, "Favorito") ? getString(row, "Favorito").toLowerCase() === "sim" : resort.favorite,
      ranking: hasValue(row, "Ranking") ? getNumber(row, "Ranking") : resort.ranking,
    };
  });
}
