export interface CostItem {
  categoria: string;
  item: string;
  valor: number;
}

export interface CostData {
  items: CostItem[];
  total: number;
  groups: Record<string, CostItem[]>;
}

export interface DailySchedule {
  dia: string;
  profissional: string;
  agendadosPlano: number;
  agendadosParticular: number;
  comparecidosPlano: number;
  comparecidosParticular: number;
  orcamentosPlano: number;
  orcamentosParticular: number;
  fechadosPlano: number;
  fechadosParticular: number;
  fechadosRsPlano: number;
  fechadosRsParticular: number;
  totalDia: number;
}

export interface WeeklySummary {
  semana: string;
  agendadosPlano: number;
  agendadosParticular: number;
  comparecidosPlano: number;
  comparecidosParticular: number;
  capacidade: number;
  pctAgendamentoCapacidade: number;
  pctComparecidos: number;
  compXAgendados: number;
  compXCapacidade: number;
  orcamentos: number;
  fechados: number;
  totalFechadosRs: number;
  totalNovasVendas: number;
}

export interface ScheduleData {
  daily: DailySchedule[];
  weeklySummaries: WeeklySummary[];
}

export interface MetaDay {
  dia: number;
  metaDiaria: number;
  alcancado: number;
  faltam: number;
  metaAcumulada: number;
  alcancadoAcumulado: number;
}

export interface MetaData {
  mes: string;
  metaMensal: number;
  metaDiaria: number;
  alcancadoTotal: number;
  faltam: number;
  pctAtingido: number;
  dias: MetaDay[];
}

export interface NPSResponse {
  data: string;
  paciente: string;
  facilidadeClareza: number;
  pontualidade: number;
  limpeza: number;
  atendimentoRecepcao: number;
  profissionalismo: number;
  explicacaoProcedimento: number;
  conforto: number;
  tempoEspera: number;
  custoBeneficio: number;
  acompanhamentoPos: number;
  comentario: string;
}

export interface NPSPeriod {
  label: string;
  promotores: number;
  neutros: number;
  detratores: number;
  nps: number;
  total: number;
}

export interface NPSData {
  responses: NPSResponse[];
  periods: NPSPeriod[];
  criteriaAverages: Record<string, number>;
}

export interface RepasseItem {
  procedimento: string;
  valor: number;
  repasseAtual: number;
  repasseIdeal: number;
  diferenca: number;
  convenio: string;
}

export interface RepasseData {
  items: RepasseItem[];
  convenios: string[];
}
