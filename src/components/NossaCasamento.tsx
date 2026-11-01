import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Heart,
  Home as HomeIcon,
  LayoutDashboard,
  Link2,
  ListChecks,
  MapPinned,
  MoreHorizontal,
  Pencil,
  Plane,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, loadWorkspace, createWorkspace, saveWorkspace as saveWorkspaceApi, joinWorkspace } from "@/lib/workspace-api";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  calculateHoneymoonIndex,
  exportResorts,
  exportWorkspace,
  formatCurrency,
  formatDate,
  importResorts,
  initialWorkspace,
  normalizeWorkspace,
  type BudgetCategory,
  type DateReminder,
  type Payment,
  type Supplier,
  type DocumentItem,
  type FlightOption,
  type Resort,
  type Status,
  type WorkspaceData,
  type WeddingTask,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tabs = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "wedding", label: "Casamento", icon: Heart },
  { id: "honeymoon", label: "Lua de mel", icon: Plane },
  { id: "flights", label: "Voos", icon: Plane },
  { id: "tasks", label: "Tarefas", icon: ListChecks },
  { id: "documents", label: "Documentos", icon: ClipboardCheck },
  { id: "budget", label: "Orçamento", icon: WalletCards },
] as const;

type TabId = (typeof tabs)[number]["id"];

function getDaysUntilWedding() {
  const target = new Date("2027-07-03T12:00:00").getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil((target - today.getTime()) / 86_400_000));
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={cn("status-pill", status === "Concluído" && "status-pill--done", status === "Em andamento" && "status-pill--progress")}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function promptValue(label: string, current: string) {
  if (typeof window === "undefined") return current;
  const next = window.prompt(label, current);
  return next === null ? current : next;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, detail, accent = "sand", icon: Icon }: { label: string; value: string; detail: string; accent?: string; icon: typeof Heart }) {
  return (
    <div className={cn("stat-card", `stat-card--${accent}`)}>
      <div className="stat-card__top"><span>{label}</span><Icon size={17} strokeWidth={1.8} /></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function AuthGate({ loading }: { loading: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) toast.success("Enviamos um e-mail de confirmação. Abram o link para entrar.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally { setBusy(false); }
  };
  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar com Google.");
  };
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark brand-mark--large"><span>N</span><span>C</span></div>
        <div className="eyebrow">PROJETO PESSOAL</div>
        <h1>Nossa<br /><em>Casamento</em></h1>
        <p>Um lugar só de vocês para cuidar das decisões do casamento e guardar a viagem que começa depois.</p>
        <Button onClick={() => void google()} disabled={loading} className="auth-button"><ShieldCheck size={17} /> Entrar com Google</Button>
        <Input type="email" placeholder="E-mail" value={email} onChange={event => setEmail(event.target.value)} />
        <Input type="password" placeholder="Senha" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void submit(); }} />
        <Button onClick={() => void submit()} disabled={busy || !email || password.length < 6} className="auth-button">{mode === "signin" ? "Entrar com e-mail" : "Criar conta"}</Button>
        <button className="text-action" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}</button>
        <small>O acesso mantém o workspace compartilhado e editável nos dois celulares.</small>
      </div>
    </div>
  );
}

function WorkspaceJoinGate({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState("");
  const join = useMutation({ mutationFn: async ({ code }: { code: string }) => { if (!(await joinWorkspace(code))) throw new Error("Código de compartilhamento inválido."); }, onSuccess: onJoined, onError: (error: Error) => toast.error(error.message) });
  return <div className="auth-screen"><div className="auth-card"><div className="brand-mark brand-mark--large"><span>N</span><span>C</span></div><div className="eyebrow">WORKSPACE COMPARTILHADO</div><h1>Entrar no<br /><em>projeto do casal</em></h1><p>Peçam o código de compartilhamento a quem criou este workspace e digitem abaixo para entrar.</p><Input autoFocus placeholder="Código de compartilhamento" value={code} onChange={event => setCode(event.target.value)} /><Button className="auth-button" disabled={code.length < 4 || join.isPending} onClick={() => join.mutate({ code })}><Link2 size={16} /> Entrar no workspace</Button><small>O código só dá acesso a este projeto; ele não altera o seu login.</small></div></div>;
}

function Sidebar({ active, setActive, user, onLogout }: { active: TabId; setActive: (tab: TabId) => void; user: { name?: string | null; email?: string | null } | null; onLogout: () => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-mark"><span>N</span><span>C</span></div>
        <div><strong>Nossa Casamento</strong><small>workspace do casal</small></div>
      </div>
      <div className="sidebar__label">PROJETO PESSOAL</div>
      <button className="project-switcher"><span className="project-dot" /> Casamento + viagem <ChevronRight size={15} /></button>
      <nav className="sidebar__nav">
        <div className="sidebar__label">NAVEGAR</div>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return <button key={tab.id} onClick={() => setActive(tab.id)} className={cn("nav-button", active === tab.id && "nav-button--active")}><Icon size={17} strokeWidth={active === tab.id ? 2.2 : 1.7} /><span>{tab.label}</span>{active === tab.id && <span className="nav-current" />}</button>;
        })}
      </nav>
      <div className="sidebar__bottom">
        <button className="nav-button"><Settings2 size={17} /><span>Personalizar</span></button>
        <div className="user-chip"><div className="avatar"><UserRound size={15} /></div><div><strong>{user?.name || "Nós dois"}</strong><small>{user?.email || "workspace privado"}</small></div><button aria-label="Sair" onClick={onLogout}><MoreHorizontal size={17} /></button></div>
      </div>
    </aside>
  );
}

function MobileNav({ active, setActive }: { active: TabId; setActive: (tab: TabId) => void }) {
  return <nav className="mobile-nav">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActive(tab.id)} className={cn(active === tab.id && "mobile-nav__active")}><Icon size={18} /><span>{tab.label.replace("Visão geral", "Início")}</span></button>; })}</nav>;
}

function ResortScore({ resort }: { resort: Resort }) {
  const score = calculateHoneymoonIndex(resort);
  return <span className={cn("score-badge", score === null && "score-badge--empty")}>{score === null ? "—" : score.toFixed(1)}</span>;
}

function Overview({ data, update, setActive }: { data: WorkspaceData; update: (next: WorkspaceData) => void; setActive: (tab: TabId) => void }) {
  const doneTasks = data.tasks.filter(task => task.status === "Concluído").length;
  const favoriteResorts = data.resorts.filter(resort => resort.favorite);
  const days = getDaysUntilWedding();
  const [editingBasics, setEditingBasics] = useState(false);
  const nextTask = data.tasks.find(task => task.status !== "Concluído");
  const budgetTotals = data.budgetCategories.reduce((acc, item) => ({ contracted: acc.contracted + item.contracted, paid: acc.paid + item.paid }), { contracted: 0, paid: 0 });
  const nextDate = data.dates.filter(item => item.status !== "Concluído" && item.date).sort((a, b) => a.date.localeCompare(b.date))[0];

  const updateBasics = (field: keyof WorkspaceData, value: string) => update({ ...data, [field]: value });

  return <>
    <section className="hero-panel">
      <div className="hero-panel__copy">
        <div className="eyebrow">{data.tripMonth} · {data.travelers} pessoas · {data.nights} noites</div>
        <h1>Nossa viagem<br /><em>começa aqui.</em> <span>✈︎</span></h1>
        <p>O espaço compartilhado para deixar as escolhas do casamento mais leves — e a lua de mel mais com a cara de vocês.</p>
        <div className="hero-panel__actions"><Button onClick={() => setActive("tasks")}><Plus size={16} /> Adicionar próxima tarefa</Button><button className="text-action" onClick={() => setActive("honeymoon")}>Ver comparador <ArrowUpRight size={15} /></button></div>
      </div>
      <div className="hero-panel__stamp"><div className="stamp-ring"><strong>{days}</strong><span>dias até<br />o grande dia</span></div><small>03 JUL 2027</small></div>
    </section>

    <div className="stats-row">
      <StatCard label="Resorts" value="48" detail={`${favoriteResorts.length} favorito${favoriteResorts.length === 1 ? "" : "s"} no comparativo`} accent="coral" icon={MapPinned} />
      <StatCard label="Orçamento viagem" value={`US$ ${data.lodgingBudgetUSD.toLocaleString("en-US")}`} detail="limite para hospedagem" accent="gold" icon={CircleDollarSign} />
      <StatCard label="Tarefas" value={`${doneTasks}/${data.tasks.length}`} detail="decisões encaminhadas" accent="blue" icon={ClipboardCheck} />
      <StatCard label="Casamento" value={formatDate(data.weddingDate)} detail={`${data.guestEstimate} convidados estimados`} accent="ink" icon={CalendarDays} />
    </div>

    <div className="content-grid content-grid--overview">
      <section className="paper-card next-card">
        <SectionTitle eyebrow="AGORA" title="Próxima coisa importante" action={<button className="icon-button"><MoreHorizontal size={17} /></button>} />
        {nextTask ? <div className="next-task"><div className="task-check" onClick={() => update({ ...data, tasks: data.tasks.map(task => task.id === nextTask.id ? { ...task, status: "Concluído" } : task) })}><Check size={15} /></div><div><strong>{nextTask.title}</strong><p>{nextTask.notes || "Sem observações ainda."}</p><div className="task-meta"><span><Clock3 size={13} /> {nextTask.dueDate ? formatDate(nextTask.dueDate) : "Sem prazo"}</span><span className={cn("priority-dot", `priority-${nextTask.priority.toLowerCase()}`)}>{nextTask.priority}</span></div></div></div> : <div className="empty-state"><CheckCircle2 size={22} /> Tudo em dia por enquanto.</div>}
        <button className="card-link" onClick={() => setActive("tasks")}>Abrir tarefas <ArrowUpRight size={15} /></button>
      </section>

      <section className="paper-card basics-card">
        <SectionTitle eyebrow="VISÃO GERAL" title="O dia de vocês" action={<button className="icon-button" onClick={() => setEditingBasics(value => !value)}><Pencil size={15} /></button>} />
        <div className="basics-list">
          <div><span>Data do casamento</span>{editingBasics ? <Input type="date" value={data.weddingDate} onChange={event => updateBasics("weddingDate", event.target.value)} onBlur={() => toast.success("Data atualizada")} /> : <strong>{formatDate(data.weddingDate)}</strong>}</div>
          <div><span>Local</span>{editingBasics ? <Input value={data.weddingLocation} onChange={event => updateBasics("weddingLocation", event.target.value)} /> : <strong>{data.weddingLocation}</strong>}</div>
          <div><span>Convidados estimados</span>{editingBasics ? <Input value={data.guestEstimate} onChange={event => updateBasics("guestEstimate", event.target.value)} /> : <strong>{data.guestEstimate}</strong>}</div>
          <div><span>Próximo prazo importante</span><strong>{nextDate ? formatDate(nextDate.date) : data.nextImportantDate}</strong></div>
          <div><span>Total contratado · pago</span><strong>{formatCurrency(budgetTotals.contracted)} · {formatCurrency(budgetTotals.paid)}</strong></div>
        </div>
        {editingBasics && <small className="inline-hint">As alterações são salvas automaticamente no workspace.</small>}
      </section>

      <section className="paper-card trip-card">
        <div className="trip-card__top"><div><div className="eyebrow">LUA DE MEL</div><h2>Quatro noites<br /><em>para comemorar.</em></h2></div><div className="trip-icon"><Plane size={21} /></div></div>
        <div className="trip-card__details"><span><MapPinned size={14} /> Saída de São Paulo</span><span><CalendarDays size={14} /> {data.tripDates}</span><span><Heart size={14} /> {favoriteResorts.length || "Nenhum"} favoritos</span></div>
        <button className="card-link" onClick={() => setActive("honeymoon")}>Continuar comparando <ArrowUpRight size={15} /></button>
      </section>

      <section className="paper-card notes-card">
        <SectionTitle eyebrow="COMBINADOS E NOTAS" title="Para não perder de vista" />
        <div className="note-stack"><div><Tag size={14} /><span>{data.notes.decisions}</span></div><div><Sparkles size={14} /><span>{data.notes.ideas}</span></div><div><Clock3 size={14} /><span>{data.notes.pending}</span></div></div>
        <button className="card-link" onClick={() => setActive("wedding")}>Editar notas <Pencil size={14} /></button>
      </section>
    </div>

    <section className="roadmap-section"><SectionTitle eyebrow="SEÇÕES DO PROJETO" title="Tudo no mesmo lugar" /><div className="roadmap-list">{[
      { label: "Comparador de resorts e suítes com hidromassagem", detail: "48 opções editáveis", target: "honeymoon" as TabId, icon: MapPinned },
      { label: "Comparador de voos e destinos", detail: "Rotas para comparar", target: "flights" as TabId, icon: Plane },
      { label: "Favoritos e ranking do casal", detail: `${favoriteResorts.length} selecionado${favoriteResorts.length === 1 ? "" : "s"}`, target: "honeymoon" as TabId, icon: Star },
      { label: "Orçamento, parcelas e custos totais", detail: "Totais automáticos", target: "budget" as TabId, icon: WalletCards },
      { label: "Checklist de passaporte, visto e documentos", detail: "3 itens iniciais", target: "documents" as TabId, icon: ClipboardCheck },
      { label: "Cronograma e planejamento da viagem", detail: "04–08 jul 2027", target: "wedding" as TabId, icon: CalendarDays },
    ].map(item => { const Icon = item.icon; return <button key={item.label} className="roadmap-item" onClick={() => setActive(item.target)}><span className="roadmap-item__icon"><Icon size={17} /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><ChevronRight size={16} /></button>; })}</div></section>
  </>;
}

function WeddingView({ data, update, setActive }: { data: WorkspaceData; update: (next: WorkspaceData) => void; setActive: (tab: TabId) => void }) {
  const [showDateForm, setShowDateForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [dateDraft, setDateDraft] = useState({ date: "", title: "", remindOn: "", owner: "Nós dois", notes: "" });
  const [supplierDraft, setSupplierDraft] = useState({ service: "", supplier: "", contact: "", url: "", amount: 0, notes: "" });
  const addDate = () => {
    if (!dateDraft.title.trim()) return;
    const next: DateReminder = { id: `date-${Date.now()}`, ...dateDraft, status: "A fazer" };
    update({ ...data, dates: [...data.dates, next].sort((a, b) => a.date.localeCompare(b.date)) });
    setDateDraft({ date: "", title: "", remindOn: "", owner: "Nós dois", notes: "" });
    setShowDateForm(false);
    toast.success("Prazo adicionado");
  };
  const addSupplier = () => {
    if (!supplierDraft.service.trim() && !supplierDraft.supplier.trim()) return;
    const next: Supplier = { id: `supplier-${Date.now()}`, ...supplierDraft };
    update({ ...data, suppliers: [next, ...data.suppliers] });
    setSupplierDraft({ service: "", supplier: "", contact: "", url: "", amount: 0, notes: "" });
    setShowSupplierForm(false);
    toast.success("Fornecedor adicionado");
  };
  const editDate = (date: DateReminder) => update({ ...data, dates: data.dates.map(item => item.id === date.id ? { ...item, title: promptValue("Compromisso ou prazo", item.title), date: promptValue("Data (AAAA-MM-DD)", item.date), remindOn: promptValue("Lembrar em (AAAA-MM-DD)", item.remindOn), owner: promptValue("Responsável", item.owner), notes: promptValue("Observações", item.notes) } : item) });
  const editSupplier = (item: Supplier) => update({ ...data, suppliers: data.suppliers.map(value => value.id === item.id ? { ...value, service: promptValue("Serviço", value.service), supplier: promptValue("Fornecedor", value.supplier), contact: promptValue("Contato", value.contact), url: promptValue("URL da proposta ou contrato", value.url), amount: Number(promptValue("Valor em R$", String(value.amount))) || 0, notes: promptValue("Observações", value.notes) } : value) });
  return <div className="view-stack">
    <section className="page-intro"><div><div className="eyebrow">PLANEJAMENTO DO CASAMENTO</div><h1>Um dia grande,<br /><em>feito de pequenas decisões.</em></h1><p>Registrem aqui cada compromisso, fornecedor e combinado para que nenhuma escolha fique solta.</p></div><div className="intro-illustration"><Heart size={31} /><span>03.07.27</span></div></section>
    <div className="content-grid content-grid--wedding">
      <section className="paper-card"><SectionTitle eyebrow="VISÃO GERAL" title="O dia de vocês" /><div className="overview-lines"><div><span>Data do casamento</span><strong>{formatDate(data.weddingDate)}</strong></div><div><span>Local</span><strong>{data.weddingLocation}</strong></div><div><span>Convidados estimados</span><strong>{data.guestEstimate}</strong></div><div><span>Orçamento total</span><strong>{formatCurrency(data.budgetCategories.reduce((sum, item) => sum + item.planned, 0))}</strong></div></div></section>
      <section className="paper-card checklist-card"><SectionTitle eyebrow="CRONOGRAMA" title="Datas e lembretes" action={<button className="icon-button" onClick={() => setShowDateForm(value => !value)}><Plus size={16} /></button>} />
        {showDateForm && <div className="mini-form"><div className="form-grid form-grid--two"><label>Compromisso<Input placeholder="Ex.: prova do vestido" value={dateDraft.title} onChange={event => setDateDraft({ ...dateDraft, title: event.target.value })} /></label><label>Data<Input type="date" value={dateDraft.date} onChange={event => setDateDraft({ ...dateDraft, date: event.target.value })} /></label><label>Lembrar em<Input type="date" value={dateDraft.remindOn} onChange={event => setDateDraft({ ...dateDraft, remindOn: event.target.value })} /></label><label>Responsável<Input value={dateDraft.owner} onChange={event => setDateDraft({ ...dateDraft, owner: event.target.value })} /></label><label>Observações<Input value={dateDraft.notes} onChange={event => setDateDraft({ ...dateDraft, notes: event.target.value })} /></label></div><div className="form-actions"><Button variant="ghost" onClick={() => setShowDateForm(false)}>Cancelar</Button><Button onClick={addDate}>Salvar prazo</Button></div></div>}
        {data.dates.map(date => <div className="reminder-row" key={date.id}><div className="date-block"><strong>{date.date ? new Date(`${date.date}T12:00:00`).getDate() : "—"}</strong><small>{date.date ? new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${date.date}T12:00:00`)) : "data"}</small></div><div><strong>{date.title}</strong><small>Lembrar em {date.remindOn ? formatDate(date.remindOn) : "data a definir"} · {date.owner}{date.notes ? ` · ${date.notes}` : ""}</small></div><div className="reminder-actions"><StatusPill status={date.status} /><button className="icon-button" onClick={() => editDate(date)} aria-label="Editar prazo"><Pencil size={13} /></button><button className="icon-button" onClick={() => update({ ...data, dates: data.dates.map(item => item.id === date.id ? { ...item, status: item.status === "Concluído" ? "A fazer" : "Concluído" } : item) })}><Check size={13} /></button><button className="icon-button" onClick={() => update({ ...data, dates: data.dates.filter(item => item.id !== date.id) })}><X size={13} /></button></div></div>)}
      </section>
    </div>
    <div className="content-grid content-grid--notes">
      <section className="paper-card"><SectionTitle eyebrow="COMBINADOS" title="Notas do casal" /><div className="note-edit-grid"><label>Decisões importantes<Textarea value={data.notes.decisions} onChange={event => update({ ...data, notes: { ...data.notes, decisions: event.target.value } })} /></label><label>Preferências e ideias<Textarea value={data.notes.ideas} onChange={event => update({ ...data, notes: { ...data.notes, ideas: event.target.value } })} /></label><label>Pendências para conversar<Textarea value={data.notes.pending} onChange={event => update({ ...data, notes: { ...data.notes, pending: event.target.value } })} /></label></div><small className="inline-hint">Notas salvas automaticamente. Guardem aqui o que ainda não cabe em uma tabela.</small></section>
      <section className="paper-card supplier-card"><SectionTitle eyebrow="FORNECEDORES" title="Links úteis" action={<button className="icon-button" onClick={() => setShowSupplierForm(value => !value)}><Plus size={16} /></button>} />
        {showSupplierForm && <div className="mini-form"><div className="form-grid form-grid--two"><label>Serviço<Input placeholder="Ex.: Fotografia" value={supplierDraft.service} onChange={event => setSupplierDraft({ ...supplierDraft, service: event.target.value })} /></label><label>Fornecedor<Input value={supplierDraft.supplier} onChange={event => setSupplierDraft({ ...supplierDraft, supplier: event.target.value })} /></label><label>Contato<Input value={supplierDraft.contact} onChange={event => setSupplierDraft({ ...supplierDraft, contact: event.target.value })} /></label><label>Valor (R$)<Input type="number" value={supplierDraft.amount} onChange={event => setSupplierDraft({ ...supplierDraft, amount: Number(event.target.value) })} /></label></div><label className="mini-form__full">URL da proposta / contrato<Input placeholder="https://..." value={supplierDraft.url} onChange={event => setSupplierDraft({ ...supplierDraft, url: event.target.value })} /></label><label className="mini-form__full">Observações<Input value={supplierDraft.notes} onChange={event => setSupplierDraft({ ...supplierDraft, notes: event.target.value })} /></label><div className="form-actions"><Button variant="ghost" onClick={() => setShowSupplierForm(false)}>Cancelar</Button><Button onClick={addSupplier}>Salvar fornecedor</Button></div></div>}
        {data.suppliers.length === 0 ? <div className="empty-state empty-state--compact"><Link2 size={19} /><span>Nenhum fornecedor ainda.<br /><small>As propostas entram aqui quando vocês começarem a cotar.</small></span></div> : data.suppliers.map(item => <div className="supplier-row" key={item.id}><div><strong>{item.service || "Serviço"}</strong><small>{item.supplier || "Fornecedor a definir"} · {item.contact || "sem contato"}{item.notes ? ` · ${item.notes}` : ""}</small></div><span>{item.url ? <a href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a> : formatCurrency(item.amount)}</span><button className="icon-button" onClick={() => editSupplier(item)} aria-label="Editar fornecedor"><Pencil size={13} /></button><button className="icon-button" onClick={() => update({ ...data, suppliers: data.suppliers.filter(value => value.id !== item.id) })}><X size={13} /></button></div>)}
      </section>
    </div>
    <section className="routine-banner"><div className="routine-banner__icon"><Sparkles size={20} /></div><div><strong>Rotina simples para atualizar</strong><p>Registrem o prazo · salvem a proposta · atualizem o contratado · adicionem parcelas · marquem quem cuida.</p></div><button onClick={() => setActive("tasks")}>Ver tarefas <ArrowUpRight size={15} /></button></section>
  </div>;
}

function TasksView({ data, update }: { data: WorkspaceData; update: (next: WorkspaceData) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", dueDate: "", owner: "Nós dois", priority: "Média" as WeddingTask["priority"], notes: "" });
  const addTask = () => { if (!draft.title.trim()) return; update({ ...data, tasks: [{ id: `task-${Date.now()}`, ...draft, status: "A fazer" }, ...data.tasks] }); setDraft({ title: "", dueDate: "", owner: "Nós dois", priority: "Média", notes: "" }); setShowAdd(false); toast.success("Tarefa adicionada"); };
  const toggleTask = (id: string) => update({ ...data, tasks: data.tasks.map(task => task.id === id ? { ...task, status: task.status === "Concluído" ? "A fazer" : "Concluído" } : task) });
  const editTask = (task: WeddingTask) => update({ ...data, tasks: data.tasks.map(item => item.id === task.id ? { ...item, title: promptValue("Tarefa ou decisão", item.title), dueDate: promptValue("Prazo (AAAA-MM-DD)", item.dueDate), owner: promptValue("Responsável", item.owner), priority: promptValue("Prioridade: Baixa, Média ou Alta", item.priority) as WeddingTask["priority"], notes: promptValue("Link ou notas", item.notes) } : item) });
  return <div className="view-stack"><section className="page-intro page-intro--small"><div><div className="eyebrow">AÇÕES COMPARTILHADAS</div><h1>Tarefas que<br /><em>andam com vocês.</em></h1><p>Prazo, responsável e prioridade visíveis para ninguém precisar lembrar sozinho.</p></div><Button onClick={() => setShowAdd(value => !value)}><Plus size={16} /> Nova tarefa</Button></section>{showAdd && <section className="paper-card add-task-card"><div className="form-grid"><label className="form-span-2">Tarefa ou decisão<Input autoFocus placeholder="Ex.: escolher fotógrafo" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label><label>Prazo<Input type="date" value={draft.dueDate} onChange={event => setDraft({ ...draft, dueDate: event.target.value })} /></label><label>Responsável<Input value={draft.owner} onChange={event => setDraft({ ...draft, owner: event.target.value })} /></label><label>Prioridade<select value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as WeddingTask["priority"] })}><option>Baixa</option><option>Média</option><option>Alta</option></select></label><label>Link ou notas<Input value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label></div><div className="form-actions"><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button><Button onClick={addTask}><Check size={15} /> Salvar tarefa</Button></div></section>}<section className="paper-card task-list-card"><SectionTitle eyebrow={`${data.tasks.length} ITENS NO PROJETO`} title="Tarefas e decisões" action={<div className="task-filter"><span className="filter-dot filter-dot--open" /> {data.tasks.filter(task => task.status !== "Concluído").length} abertas</div>} /><div className="task-table"><div className="task-table__head"><span> tarefa ou decisão</span><span>prazo</span><span>responsável</span><span>prioridade</span><span>status</span><span /></div>{data.tasks.map(task => <div className={cn("task-row", task.status === "Concluído" && "task-row--done")} key={task.id}><button className={cn("task-checkbox", task.status === "Concluído" && "task-checkbox--done")} onClick={() => toggleTask(task.id)}>{task.status === "Concluído" && <Check size={13} />}</button><div className="task-title"><strong>{task.title}</strong>{task.notes && <small>{task.notes}</small>}</div><span>{task.dueDate ? formatDate(task.dueDate) : "—"}</span><span>{task.owner}</span><span className={cn("priority-label", `priority-label--${task.priority.toLowerCase()}`)}>{task.priority}</span><StatusPill status={task.status} /><button className="icon-button" onClick={() => editTask(task)} aria-label="Editar tarefa"><Pencil size={14} /></button><button className="icon-button" onClick={() => update({ ...data, tasks: data.tasks.filter(item => item.id !== task.id) })}><X size={14} /></button></div>)}</div></section><section className="routine-banner routine-banner--cream"><BellRing size={21} /><div><strong>Notificações no celular</strong><p>Ative os alertas deste navegador para receber um lembrete local quando vocês estiverem usando o workspace no celular.</p></div><Button variant="outline" onClick={async () => { if (!("Notification" in window)) { toast.error("Este navegador não oferece notificações."); return; } const permission = await Notification.requestPermission(); toast(permission === "granted" ? "Notificações ativadas neste dispositivo." : "Permissão de notificações não concedida."); }}>Ativar alertas</Button></section></div>;
}

function EditableBudgetRow({ category, update }: { category: BudgetCategory; update: (category: BudgetCategory) => void }) {
  return <div className="budget-row"><Input value={category.name} onChange={event => update({ ...category, name: event.target.value })} /><Input type="number" value={category.planned} onChange={event => update({ ...category, planned: Number(event.target.value) })} /><Input type="number" value={category.contracted} onChange={event => update({ ...category, contracted: Number(event.target.value) })} /><Input type="number" value={category.paid} onChange={event => update({ ...category, paid: Number(event.target.value) })} /><strong>{formatCurrency(category.contracted - category.paid)}</strong></div>;
}

function BudgetView({ data, update }: { data: WorkspaceData; update: (next: WorkspaceData) => void }) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({ dueDate: "", item: "", amount: 0, paidOn: "", method: "", status: "Pendente" as Payment["status"], receipt: "" });
  const totals = data.budgetCategories.reduce((acc, item) => ({ planned: acc.planned + item.planned, contracted: acc.contracted + item.contracted, paid: acc.paid + item.paid }), { planned: 0, contracted: 0, paid: 0 });
  const addCategory = () => update({ ...data, budgetCategories: [...data.budgetCategories, { id: `budget-${Date.now()}`, name: "Nova categoria", planned: 0, contracted: 0, paid: 0 }] });
  const addPayment = () => {
    if (!paymentDraft.item.trim()) return;
    const next: Payment = { id: `payment-${Date.now()}`, ...paymentDraft };
    update({ ...data, payments: [next, ...data.payments] });
    setPaymentDraft({ dueDate: "", item: "", amount: 0, paidOn: "", method: "", status: "Pendente", receipt: "" });
    setShowPayment(false);
    toast.success("Pagamento adicionado");
  };
  const editPayment = (payment: Payment) => update({ ...data, payments: data.payments.map(item => item.id === payment.id ? { ...item, item: promptValue("Item ou fornecedor", item.item), dueDate: promptValue("Vencimento (AAAA-MM-DD)", item.dueDate), amount: Number(promptValue("Valor em R$", String(item.amount))) || 0, paidOn: promptValue("Pago em (AAAA-MM-DD)", item.paidOn), method: promptValue("Forma de pagamento", item.method), status: promptValue("Status: Pendente ou Pago", item.status) as Payment["status"], receipt: promptValue("Comprovante ou link", item.receipt) } : item) });
  return <div className="view-stack"><section className="page-intro page-intro--small"><div><div className="eyebrow">ORÇAMENTO DO CASAMENTO</div><h1>Dinheiro claro,<br /><em>decisões mais leves.</em></h1><p>Atualizem previsto, contratado e pago. O saldo aparece sozinho para o casal.</p></div><Button variant="outline" onClick={addCategory}><Plus size={16} /> Nova categoria</Button></section><div className="stats-row stats-row--budget"><StatCard label="Previsto" value={formatCurrency(totals.planned)} detail="planejamento inicial" accent="sand" icon={CircleDollarSign} /><StatCard label="Contratado" value={formatCurrency(totals.contracted)} detail="compromissos fechados" accent="coral" icon={ShieldCheck} /><StatCard label="Pago" value={formatCurrency(totals.paid)} detail="parcelas quitadas" accent="blue" icon={CheckCircle2} /><StatCard label="Saldo" value={formatCurrency(totals.contracted - totals.paid)} detail="a pagar nos contratos" accent="gold" icon={WalletCards} /></div><section className="paper-card budget-card"><SectionTitle eyebrow="TOTAIS AUTOMÁTICOS" title="Orçamento por categoria" /><div className="budget-table"><div className="budget-head"><span>categoria</span><span>previsto</span><span>contratado</span><span>pago</span><span>saldo</span></div>{data.budgetCategories.map(category => <EditableBudgetRow key={category.id} category={category} update={next => update({ ...data, budgetCategories: data.budgetCategories.map(item => item.id === next.id ? next : item) })} />)}</div><small className="inline-hint">Valores em R$. O total contratado e o total pago também aparecem na visão geral.</small></section><section className="paper-card payments-card"><SectionTitle eyebrow="FLUXO DE CAIXA" title="Pagamentos e finanças" action={<button className="icon-button" onClick={() => setShowPayment(value => !value)}><Plus size={16} /></button>} />{showPayment && <div className="mini-form"><div className="form-grid"><label>Item / fornecedor<Input placeholder="Ex.: sinal do buffet" value={paymentDraft.item} onChange={event => setPaymentDraft({ ...paymentDraft, item: event.target.value })} /></label><label>Vencimento<Input type="date" value={paymentDraft.dueDate} onChange={event => setPaymentDraft({ ...paymentDraft, dueDate: event.target.value })} /></label><label>Valor (R$)<Input type="number" value={paymentDraft.amount} onChange={event => setPaymentDraft({ ...paymentDraft, amount: Number(event.target.value) })} /></label><label>Pago em<Input type="date" value={paymentDraft.paidOn} onChange={event => setPaymentDraft({ ...paymentDraft, paidOn: event.target.value })} /></label><label>Forma de pagamento<Input value={paymentDraft.method} onChange={event => setPaymentDraft({ ...paymentDraft, method: event.target.value })} /></label><label>Status<select value={paymentDraft.status} onChange={event => setPaymentDraft({ ...paymentDraft, status: event.target.value as Payment["status"] })}><option>Pendente</option><option>Pago</option></select></label></div><label className="mini-form__full">Comprovante ou link<Input value={paymentDraft.receipt} onChange={event => setPaymentDraft({ ...paymentDraft, receipt: event.target.value })} /></label><div className="form-actions"><Button variant="ghost" onClick={() => setShowPayment(false)}>Cancelar</Button><Button onClick={addPayment}>Salvar pagamento</Button></div></div>}{data.payments.length === 0 ? <div className="empty-state"><CircleDollarSign size={21} /><span>Nenhum pagamento lançado.<br /><small>Quando houver uma parcela, registrem vencimento, forma e comprovante aqui.</small></span></div> : data.payments.map(payment => <div className="payment-row" key={payment.id}><div><strong>{payment.item}</strong><small>Vence {formatDate(payment.dueDate)} · {payment.method || "forma a definir"}{payment.receipt ? ` · ${payment.receipt}` : ""}</small></div><strong>{formatCurrency(payment.amount)}</strong><StatusPill status={payment.status === "Pago" ? "Concluído" : "A fazer"} /><button className="icon-button" onClick={() => editPayment(payment)} aria-label="Editar pagamento"><Pencil size={13} /></button><button className="icon-button" onClick={() => update({ ...data, payments: data.payments.filter(item => item.id !== payment.id) })}><X size={13} /></button></div>)}</section></div>;
}

function FlightsView({ data, update }: { data: WorkspaceData; update: (next: WorkspaceData) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ route: "São Paulo → destino", airline: "", date: "", duration: "", priceBRL: null as number | null, notes: "" });
  const addFlight = () => { if (!draft.airline.trim() && !draft.route.trim()) return; update({ ...data, flights: [{ id: `flight-${Date.now()}`, ...draft, favorite: false }, ...data.flights] }); setDraft({ route: "São Paulo → destino", airline: "", date: "", duration: "", priceBRL: null, notes: "" }); setShowAdd(false); toast.success("Opção de voo adicionada"); };
  return <div className="view-stack"><section className="page-intro page-intro--small"><div><div className="eyebrow">COMPARADOR DE VOOS E DESTINOS</div><h1>O caminho também<br /><em>faz parte da viagem.</em></h1><p>Guardem opções de ida e volta para 04–08/07/2027 e comparem junto com o resort.</p></div><Button onClick={() => setShowAdd(value => !value)}><Plus size={16} /> Nova opção</Button></section>{showAdd && <section className="paper-card add-task-card"><div className="form-grid"><label>Rota<Input value={draft.route} onChange={event => setDraft({ ...draft, route: event.target.value })} /></label><label>Companhia aérea<Input value={draft.airline} onChange={event => setDraft({ ...draft, airline: event.target.value })} /></label><label>Data<Input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>Duração<Input value={draft.duration} onChange={event => setDraft({ ...draft, duration: event.target.value })} /></label><label>Preço total (R$)<Input type="number" value={draft.priceBRL ?? ""} onChange={event => setDraft({ ...draft, priceBRL: event.target.value ? Number(event.target.value) : null })} /></label><label>Observações<Input value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label></div><div className="form-actions"><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button><Button onClick={addFlight}>Salvar opção</Button></div></section>}<section className="paper-card"><SectionTitle eyebrow={`${data.flights.length} OPÇÕES SALVAS`} title="Rotas para comparar" /><div className="flight-list">{data.flights.map(flight => <div className="flight-row" key={flight.id}><div className="flight-route"><Plane size={17} /><div><strong>{flight.route}</strong><small>{flight.airline || "Companhia a definir"} · {flight.date ? formatDate(flight.date) : "Data flexível"}</small></div></div><span>{flight.duration || "—"}</span><strong>{flight.priceBRL ? formatCurrency(flight.priceBRL) : "A cotar"}</strong><button className={cn("icon-button", flight.favorite && "favorite-icon")} onClick={() => update({ ...data, flights: data.flights.map(item => item.id === flight.id ? { ...item, favorite: !item.favorite } : item) })}><Star size={15} fill={flight.favorite ? "currentColor" : "none"} /></button><button className="icon-button" onClick={() => update({ ...data, flights: data.flights.filter(item => item.id !== flight.id) })}><X size={13} /></button></div>)}</div></section><section className="notice-banner"><Plane size={18} /><p><strong>Próxima etapa:</strong> depois de escolherem alguns destinos, este comparador pode receber links de cotação e conexão com os resorts favoritos.</p></section></div>;
}

function DocumentsView({ data, update }: { data: WorkspaceData; update: (next: WorkspaceData) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", owner: "Nós dois", dueDate: "", notes: "" });
  const addDocument = () => { if (!draft.title.trim()) return; update({ ...data, documents: [{ id: `document-${Date.now()}`, ...draft, status: "A fazer" }, ...data.documents] }); setDraft({ title: "", owner: "Nós dois", dueDate: "", notes: "" }); setShowAdd(false); toast.success("Item adicionado ao checklist"); };
  const toggleDocument = (item: DocumentItem) => update({ ...data, documents: data.documents.map(value => value.id === item.id ? { ...value, status: value.status === "Concluído" ? "A fazer" : "Concluído" } : value) });
  return <div className="view-stack"><section className="page-intro page-intro--small"><div><div className="eyebrow">CHECKLIST DE PASSAPORTE, VISTO E DOCUMENTOS</div><h1>O que precisa estar<br /><em>pronto antes de ir.</em></h1><p>Uma lista compartilhada para não deixar a parte prática para a última semana.</p></div><Button onClick={() => setShowAdd(value => !value)}><Plus size={16} /> Novo item</Button></section>{showAdd && <section className="paper-card add-task-card"><div className="form-grid form-grid--two"><label>Item do checklist<Input autoFocus placeholder="Ex.: comprovante de vacinação" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label><label>Responsável<Input value={draft.owner} onChange={event => setDraft({ ...draft, owner: event.target.value })} /></label><label>Prazo<Input type="date" value={draft.dueDate} onChange={event => setDraft({ ...draft, dueDate: event.target.value })} /></label><label>Observação<Input value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label></div><div className="form-actions"><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button><Button onClick={addDocument}>Salvar item</Button></div></section>}<section className="paper-card document-card"><SectionTitle eyebrow={`${data.documents.filter(item => item.status === "Concluído").length} DE ${data.documents.length} CONCLUÍDOS`} title="Checklist da viagem" /><div className="document-list">{data.documents.map(item => <div className={cn("document-row", item.status === "Concluído" && "document-row--done")} key={item.id}><button className={cn("task-checkbox", item.status === "Concluído" && "task-checkbox--done")} onClick={() => toggleDocument(item)}>{item.status === "Concluído" && <Check size={13} />}</button><div><strong>{item.title}</strong><small>{item.notes || "Sem observações"}</small></div><span>{item.dueDate ? formatDate(item.dueDate) : "Sem prazo"}</span><span>{item.owner}</span><button className="icon-button" onClick={() => update({ ...data, documents: data.documents.filter(value => value.id !== item.id) })}><X size={13} /></button></div>)}</div></section></div>;
}

function ResortEditor({ resort, update, close }: { resort: Resort; update: (next: Resort) => void; close: () => void }) {
  const updateField = <K extends keyof Resort>(field: K, value: Resort[K]) => update({ ...resort, [field]: value });
  return <aside className="resort-editor"><div className="editor-header"><div><div className="eyebrow">OPÇÃO {(resort.id.split("-")[1] ?? "").padStart(2, "0")} DE 48</div><h2>Editar resort</h2></div><button className="icon-button" onClick={close}><X size={17} /></button></div><div className="editor-body"><label>Nome do resort<Input value={resort.name} onChange={event => updateField("name", event.target.value)} /></label><div className="form-grid form-grid--two"><label>Região<Input value={resort.region} onChange={event => updateField("region", event.target.value)} /></label><label>Destino<Input value={resort.destination} onChange={event => updateField("destination", event.target.value)} /></label></div><label>Link para Booking ou outro site<Input placeholder="https://..." value={resort.bookingUrl} onChange={event => updateField("bookingUrl", event.target.value)} /></label><div className="editor-link-row">{resort.bookingUrl ? <a href={resort.bookingUrl} target="_blank" rel="noreferrer">Abrir link <ExternalLink size={14} /></a> : <span><Link2 size={14} /> Adicione um link editável</span>}</div><label>Suíte/categoria analisada<Input value={resort.suite} onChange={event => updateField("suite", event.target.value)} /></label><label>Hidro na suíte?<select value={resort.hydro} onChange={event => updateField("hydro", event.target.value as Resort["hydro"])}><option>Confirmada</option><option>A confirmar</option><option>Não</option></select></label><div className="form-grid form-grid--two"><label>Hotel 4 noites (R$)<Input type="number" value={resort.hotelBRL ?? ""} onChange={event => updateField("hotelBRL", event.target.value ? Number(event.target.value) : null)} /></label><label>Hotel 4 noites (US$)<Input type="number" value={resort.hotelUSD ?? ""} onChange={event => updateField("hotelUSD", event.target.value ? Number(event.target.value) : null)} /></label><label>Referência/período<Input value={resort.reference} onChange={event => updateField("reference", event.target.value)} /></label></div><div className="rating-grid"><label>Booking<Input type="number" min="0" max="10" value={resort.bookingRating ?? ""} onChange={event => updateField("bookingRating", event.target.value ? Number(event.target.value) : null)} /></label><label>Resort<Input type="number" min="0" max="10" value={resort.resortRating ?? ""} onChange={event => updateField("resortRating", event.target.value ? Number(event.target.value) : null)} /></label><label>Quarto<Input type="number" min="0" max="10" value={resort.roomRating ?? ""} onChange={event => updateField("roomRating", event.target.value ? Number(event.target.value) : null)} /></label><label>Romantismo<Input type="number" min="0" max="10" value={resort.romanceRating ?? ""} onChange={event => updateField("romanceRating", event.target.value ? Number(event.target.value) : null)} /></label><label>Orçamento<Input type="number" min="0" max="10" value={resort.budgetRating ?? ""} onChange={event => updateField("budgetRating", event.target.value ? Number(event.target.value) : null)} /></label></div><label>Aderência ao estilo do casal<Input value={resort.styleFit} onChange={event => updateField("styleFit", event.target.value)} /></label><label className="favorite-toggle"><input type="checkbox" checked={resort.favorite} onChange={event => updateField("favorite", event.target.checked)} /> <Star size={15} /> Marcar como favorito</label><div className="editor-score"><span>Índice Lua de Mel</span><strong><ResortScore resort={resort} /></strong><small>Estrutura 40% · quarto 35% · romantismo 15% · orçamento 10%</small></div></div><div className="editor-footer"><Button variant="outline" onClick={close}>Concluir edição</Button></div></aside>;
}

function HoneymoonView({ data, update }: { data: WorkspaceData; update: (next: WorkspaceData) => void }) {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.resorts.find(resort => resort.id === selectedId) ?? null;
  const filtered = data.resorts.filter(resort => {
    const matchesQuery = [resort.name, resort.destination, resort.region, resort.suite].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!favoritesOnly || resort.favorite);
  });
  const handleExport = () => { exportWorkspace(data); toast.success("Workspace completo exportado para Excel."); };
  const handleImport = async (file: File) => { try { const resorts = await importResorts(file, data.resorts); update({ ...data, resorts }); toast.success("Planilha importada sem apagar as outras áreas."); } catch { toast.error("Não foi possível ler essa planilha."); } };
  const updateResort = (next: Resort) => update({ ...data, resorts: data.resorts.map(resort => resort.id === next.id ? next : resort) });
  return <div className="view-stack"><section className="page-intro page-intro--honeymoon"><div><div className="eyebrow">RELATÓRIO DE LUA DE MEL · 2 ADULTOS · 4 NOITES</div><h1>O resort certo<br /><em>tem que parecer vocês.</em></h1><p>Comparação com referência 04–08/07/2027, saída de São Paulo. Valores sem cotação exata continuam em aberto.</p></div><div className="honeymoon-callout"><Star size={16} fill="currentColor" /><span><strong>US$ 1.600</strong><small>teto de hospedagem</small></span></div></section><section className="notice-banner"><ShieldCheck size={18} /><p><strong>Importante sobre a hidro:</strong> jacuzzi do spa ou da piscina não conta. Só marcamos “Confirmada” quando a descrição está dentro da categoria do quarto ou há confirmação escrita do hotel.</p></section><section className="paper-card benchmark-card"><div><div className="eyebrow">NOSSO BENCHMARK</div><h2>Grand Bávaro Princess<br /><em>Honeymoon Platinum Suite</em></h2><p>Confirmar por escrito se a banheira tem jatos/hidromassagem — há divergência entre páginas.</p></div><div className="benchmark-side"><span>ÍNDICE ATUAL</span><strong><ResortScore resort={data.resorts.find(item => item.name.startsWith("Grand Bávaro")) ?? data.resorts[0]!} /></strong><small>A confirmar</small></div></section><section className="paper-card resort-table-card"><SectionTitle eyebrow={`${filtered.length} DE 48 OPÇÕES`} title="Comparador de resorts e suítes" action={<div className="table-actions"><label className="search-field"><Search size={15} /><input placeholder="Buscar destino ou resort" value={query} onChange={event => setQuery(event.target.value)} /></label><button className={cn("filter-button", favoritesOnly && "filter-button--active")} onClick={() => setFavoritesOnly(value => !value)}><Star size={14} /> Favoritos</button><label className="import-button"><Upload size={14} /> Importar Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={event => { const file = event.target.files?.[0]; if (file) void handleImport(file); event.currentTarget.value = ""; }} /></label><button className="filter-button" onClick={handleExport}><Download size={14} /> Exportar</button></div>} /><div className="comparison-table"><div className="comparison-head"><span>resort / destino</span><span>suíte + hidro</span><span>US$ 4 noites</span><span>índice</span><span>link</span></div>{filtered.map(resort => <button className="comparison-row" key={resort.id} onClick={() => setSelectedId(resort.id)}><span className="resort-name"><span className={cn("resort-fav", resort.favorite && "resort-fav--active")}><Star size={14} fill={resort.favorite ? "currentColor" : "none"} /></span><span><strong>{resort.name}</strong><small>{resort.destination} · {resort.profile}</small></span></span><span className="suite-cell"><strong>{resort.suite}</strong><small className={cn("hydro-label", `hydro-${resort.hydro.toLowerCase().replace(" ", "-")}`)}>{resort.hydro === "Confirmada" ? "● Hidro confirmada" : resort.hydro === "A confirmar" ? "○ A confirmar" : "— Sem hidro"}</small></span><span>{resort.hotelUSD ? `$${resort.hotelUSD.toLocaleString("en-US")}` : "—"}</span><ResortScore resort={resort} /><span>{resort.bookingUrl ? <ExternalLink size={15} /> : <Pencil size={14} />}</span></button>)}{filtered.length === 0 && <div className="empty-state"><Search size={20} /> Nenhuma opção encontrada.</div>}</div></section><section className="paper-card spreadsheet-note"><FileSpreadsheet size={21} /><div><strong>Importação e exportação sem travar o resto do projeto.</strong><p>Use os nomes de campos do Excel que vocês já definiram. A importação atualiza somente as 48 linhas de resorts.</p></div><button onClick={() => { exportResorts(data.resorts); toast.success("Modelo de resorts exportado."); }}>Baixar modelo <Download size={14} /></button></section>{selected && <ResortEditor resort={selected} update={updateResort} close={() => setSelectedId(null)} />}</div>;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [active, setActive] = useState<TabId>("overview");
  const workspaceQuery = useQuery({
    queryKey: ["workspace", user?.email],
    enabled: isAuthenticated,
    retry: false,
    queryFn: async () => {
      let result = await loadWorkspace();
      if (result.status === "empty") { await createWorkspace(initialWorkspace); result = await loadWorkspace(); }
      return result;
    },
  });
  const shareCode = workspaceQuery.data?.status === "member" ? workspaceQuery.data.code : null;
  const shareCodeQuery = { data: { code: shareCode } };
  const saveWorkspace = useMutation({ mutationFn: ({ data }: { data: Record<string, unknown> }) => saveWorkspaceApi(data) });
  const [data, setData] = useState<WorkspaceData>(initialWorkspace);

  useEffect(() => {
    if (workspaceQuery.data?.status === "member" && workspaceQuery.data.data) setData(normalizeWorkspace(workspaceQuery.data.data));
  }, [workspaceQuery.data]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [
      ...data.tasks.filter(item => item.status !== "Concluído" && item.dueDate).map(item => ({ id: item.id, title: item.title, date: item.dueDate })),
      ...data.dates.filter(item => item.status !== "Concluído" && item.remindOn).map(item => ({ id: `reminder-${item.id}`, title: item.title, date: item.remindOn })),
    ].filter(item => {
      const date = new Date(`${item.date}T12:00:00`);
      const days = (date.getTime() - today.getTime()) / 86_400_000;
      return days >= 0 && days <= 7;
    });
    const notified = JSON.parse(localStorage.getItem("nossa-casamento-notified") || "[]") as string[];
    const nextNotified = [...notified];
    upcoming.forEach(item => {
      const key = `${item.id}-${item.date}`;
      if (nextNotified.includes(key)) return;
      new Notification("Lembrete · Nossa Casamento", { body: `${item.title} · ${formatDate(item.date)}` });
      nextNotified.push(key);
    });
    localStorage.setItem("nossa-casamento-notified", JSON.stringify(nextNotified.slice(-40)));
  }, [data.tasks, data.dates]);

  const update = (next: WorkspaceData) => {
    setData(next);
    saveWorkspace.mutate({ data: next as unknown as Record<string, unknown> }, {
      onError: () => toast.error("Não foi possível salvar agora. Tentem novamente."),
    });
  };

  const activeLabel = useMemo(() => tabs.find(tab => tab.id === active)?.label ?? "Visão geral", [active]);
  if (authLoading) return <div className="loading-screen"><div className="brand-mark brand-mark--large"><span>N</span><span>C</span></div><div className="loading-line" /><p>abrindo o workspace de vocês…</p></div>;
  if (!isAuthenticated) return <AuthGate loading={authLoading} />;
  if (workspaceQuery.data?.status === "needs_code") return <WorkspaceJoinGate onJoined={() => void workspaceQuery.refetch()} />;

  return <div className="app-shell"><Sidebar active={active} setActive={setActive} user={user} onLogout={() => void logout()} /><div className="workspace"><header className="topbar"><div className="mobile-menu-button mobile-menu-button--static" aria-hidden="true"><div className="project-dot" /></div><div className="breadcrumb"><span>Casamento + viagem</span><ChevronRight size={14} /><strong>{activeLabel}</strong></div><div className="topbar__actions"><span className="sync-status"><span className="sync-dot" /> {saveWorkspace.isPending ? "salvando…" : "salvo agora"}</span>{shareCodeQuery.data?.code && <button className="share-button" onClick={async () => { const code = shareCodeQuery.data?.code; if (!code) return; await navigator.clipboard?.writeText(code); toast.success(`Código copiado: ${code}`); }}>Compartilhar <Link2 size={14} /></button>}<button className="icon-button notification-button" onClick={() => setActive("tasks")}><Bell size={18} /><span /></button><div className="mini-avatar"><UserRound size={15} /></div></div></header><main className="main-content">{active === "overview" && <Overview data={data} update={update} setActive={setActive} />}{active === "wedding" && <WeddingView data={data} update={update} setActive={setActive} />}{active === "tasks" && <TasksView data={data} update={update} />}{active === "budget" && <BudgetView data={data} update={update} />}{active === "honeymoon" && <HoneymoonView data={data} update={update} />} {active === "flights" && <FlightsView data={data} update={update} />} {active === "documents" && <DocumentsView data={data} update={update} />}</main><footer className="workspace-footer"><span>feito para duas pessoas, uma decisão de cada vez.</span><span>última edição compartilhada</span></footer></div><MobileNav active={active} setActive={setActive} /></div>;
}
