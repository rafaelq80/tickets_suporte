// Golden set da avaliação de tickets.
// Cada caso descreve o que a avaliação DEVERIA concluir (não o que ela conclui hoje).
//
//   expect:        { "<verificação>": "ok" | "alerta" }   ("alerta" = qualquer nível diferente de ok)
//   score:         [mín, máx]   faixa aceitável da nota final (opcional)
//   naoMencionar:  { "<verificação>": /regex/ }   texto (msg + dica) que NÃO pode aparecer
//   known:         true  → falha conhecida hoje. Não quebra o teste; quando passar a funcionar,
//                          o script avisa para você remover a marca.
//   concluirApos:  minutos entre abertura e conclusão (só vale com status "Resolvido"; padrão 90)

const N = {
  TIT: "Título do chamado", CAT: "Categoria selecionada", PRI: "Prioridade & Justificativa",
  DES: "Descrição detalhada do problema", PAS: "Passos realizados", ANX: "Anexos técnicos",
  SENS: "Dados sensíveis (LGPD)", COER: "Coerência entre status e passos",
  IMP: "Impacto declarado na prioridade", TEMPO: "Tempo de atendimento",
  TXT: "Qualidade do texto", DET: "Detalhe técnico do problema", DUP: "Possível duplicidade"
};

const BASE = {
  titulo: "Outlook não abre no notebook do financeiro",
  categoria: "E-mail", usuario: "Maria Souza", departamento: "Financeiro",
  prioridade: "Alta",
  justificativa: "Impede o fechamento mensal; toda a equipe do financeiro está sem e-mail",
  descricao: "Desde hoje de manhã o Outlook não abre no notebook com Windows 11. Aparece o erro 0x800CCC0E ao iniciar o programa. Tentei reiniciar o computador e limpar o cache sem sucesso.",
  passos: "1. Reiniciei o notebook e testei o Outlook\n2. Abri o Outlook em modo seguro e o erro continuou\n3. Recriei o perfil de e-mail pelo Painel de Controle\n4. Confirmei com a usuária que o Outlook abriu e o e-mail normalizou",
  anexos: "print_erro.png", observacoes: "", status: "Resolvido", responsavel: "Carlos Lima"
};
const com = (o) => ({ ...BASE, ...o });
const TODOS_OK = Object.fromEntries(Object.values(N).map(n => [n, "ok"]));

module.exports = [
  // ───────────── Referências de qualidade ─────────────
  { id: "ref-bom-completo", desc: "Ticket completo deve ter nota alta e nenhum alerta",
    form: com({}), expect: TODOS_OK, score: [85, 100] },

  { id: "ref-ruim-teste", desc: "Ticket de teste/sem conteúdo deve ter nota baixa",
    form: com({ titulo: "teste", categoria: "Rede", usuario: "joao silva", prioridade: "Crítica", justificativa: "urgente",
      descricao: "asdf asdf asdf asdf asdf asdf asdf asdf asdf", passos: "ok", anexos: "Nenhum", status: "Em andamento" }),
    expect: { [N.TXT]: "alerta", [N.TIT]: "alerta", [N.DES]: "alerta", [N.PAS]: "alerta" }, score: [0, 49] },

  // ───────────── Dados sensíveis (LGPD) ─────────────
  { id: "sens-cpf-formatado", desc: "CPF válido formatado deve alertar",
    form: com({ descricao: BASE.descricao + " CPF do usuário 529.982.247-25." }), expect: { [N.SENS]: "alerta" } },
  { id: "sens-cpf-sem-pontuacao", desc: "CPF válido sem pontuação deve alertar",
    form: com({ descricao: BASE.descricao + " CPF 52998224725." }), expect: { [N.SENS]: "alerta" } },
  { id: "sens-cartao-visa", desc: "Número de cartão válido deve alertar",
    form: com({ descricao: BASE.descricao + " Cartão 4111 1111 1111 1111." }), expect: { [N.SENS]: "alerta" } },
  { id: "sens-senha", desc: "Senha digitada nos passos deve alertar",
    form: com({ passos: BASE.passos + "\n5. Entrei com senha: Abc12345 informada pelo usuário" }), expect: { [N.SENS]: "alerta" } },
  { id: "sens-api-key", desc: "Chave de API deve alertar",
    form: com({ observacoes: "api_key=sk_live_1234567890abcdef" }), expect: { [N.SENS]: "alerta" } },
  { id: "sens-cpf-mascarado", desc: "CPF mascarado não deve alertar",
    form: com({ descricao: BASE.descricao + " CPF ***.***.***-25." }), expect: { [N.SENS]: "ok" } },
  { id: "sens-imei-nao-e-cartao", desc: "IMEI (15 dígitos, passa no Luhn) não é cartão",
    form: com({ categoria: "Dispositivo móvel", descricao: BASE.descricao + " IMEI do aparelho 490154203237518." }),
    expect: { [N.SENS]: "ok" }, known: true },
  { id: "sens-hash-md5", desc: "Hash/checksum de arquivo não é token",
    form: com({ descricao: BASE.descricao + " Checksum md5 d41d8cd98f00b204e9800998ecf8427e do instalador difere do site." }),
    expect: { [N.SENS]: "ok" }, known: true },
  { id: "sens-token-palavra", desc: "A palavra 'token' seguida de termo comum não é credencial",
    form: com({ descricao: BASE.descricao + " Falha de token authentication ao entrar no portal." }),
    expect: { [N.SENS]: "ok" }, known: true },

  // ───────────── Coerência status × passos ─────────────
  { id: "coer-nao-funcionou", desc: "Resolvido, mas os passos finais dizem que NÃO funcionou",
    form: com({ categoria: "Rede", titulo: "Sem internet na estação do almoxarifado",
      descricao: "Desde ontem a estação do almoxarifado não acessa a internet no desktop com Windows 10. Aparece o aviso sem acesso à internet. Tentei reiniciar o computador.",
      passos: "1. Verifiquei o cabo de rede da estação\n2. Reiniciei o roteador do setor\n3. Testei novamente a conexão, mas não funcionou\n4. Reiniciei o switch, mas não funcionou" }),
    expect: { [N.COER]: "alerta" }, known: true },
  { id: "coer-resolvido-sem-solucao", desc: "Resolvido sem registrar a solução/confirmação",
    form: com({ passos: "1. Verifiquei o cabo\n2. Abri o gerenciador de dispositivos\n3. Atualizei o driver de vídeo\n4. Anotei o patrimônio do equipamento" }),
    expect: { [N.COER]: "alerta" } },
  { id: "coer-escalado-sem-escalar", desc: "Escalado para N2 sem passo de escalonamento",
    form: com({ status: "Escalado para N2", passos: "1. Reiniciei o equipamento\n2. Testei a conexão\n3. Troquei o cabo\n4. Anotei o patrimônio" }),
    expect: { [N.COER]: "alerta" } },
  { id: "coer-escalado-ok", desc: "Escalado com passo de escalonamento é coerente",
    form: com({ status: "Escalado para N2", passos: "1. Reiniciei o equipamento\n2. Testei a conexão\n3. Troquei o cabo\n4. Escalei o chamado para o N2 com os logs anexados" }),
    expect: { [N.COER]: "ok" } },

  // ───────────── Prioridade / impacto ─────────────
  { id: "imp-alta-sem-escopo", desc: "Prioridade Alta sem dizer quem/o que é afetado",
    form: com({ justificativa: "Preciso disso rápido por favor" }), expect: { [N.IMP]: "alerta" } },
  { id: "imp-diretoria", desc: "Alta para a Diretoria se sustenta pelo departamento do solicitante",
    form: com({ departamento: "Diretoria", justificativa: "Bloqueia o acesso do diretor ao sistema de aprovações" }),
    expect: { [N.IMP]: "ok" }, known: true },
  { id: "pri-alternativa-sem-impacto", desc: "Justificativa só cita alternativa, sem descrever impacto",
    form: com({ prioridade: "Média", justificativa: "Existe alternativa para continuar trabalhando" }),
    expect: { [N.PRI]: "alerta" }, known: true },

  // ───────────── Tempo, qualidade do texto ─────────────
  { id: "tempo-reset-senha-rapido", desc: "Reset de senha legitimamente resolvido em 1 min (debatível)",
    form: com({ categoria: "Acesso/Login", titulo: "Reset de senha no portal do RH", prioridade: "Baixa", justificativa: "Atinge um único usuário, sem prazo crítico" }),
    concluirApos: 1, expect: { [N.TEMPO]: "ok" }, known: true },
  { id: "txt-caps-exclamacao", desc: "Texto em caixa alta e com excesso de pontuação",
    form: com({ titulo: "IMPRESSORA NÃO FUNCIONA!!!!", categoria: "Impressora" }), expect: { [N.TXT]: "alerta" } },
  { id: "txt-xxx-mascarado", desc: "Máscara 'xxx' em IP não é texto de teste",
    form: com({ descricao: BASE.descricao + " Rede 10.0.xxx.xxx mascarada por segurança." }), expect: { [N.TXT]: "ok" }, known: true },
  { id: "txt-separador-de-log", desc: "Separador '======' colado de um log não é texto de teste",
    form: com({ passos: BASE.passos + "\n5. Coletei o log do cliente: ====== início do log ======" }), expect: { [N.TXT]: "ok" }, known: true },

  // ───────────── Detalhe técnico ─────────────
  { id: "det-450-colaboradores", desc: "'450' é número de pessoas, não código de erro",
    form: com({ categoria: "Software", descricao: "Aparece uma mensagem de erro ao sincronizar a planilha no Windows 11, afetando 450 colaboradores do setor." }),
    expect: { [N.DET]: "alerta" }, known: true },
  { id: "det-ip-como-versao", desc: "Endereço IP não é versão de software",
    form: com({ categoria: "Software", descricao: "O sistema interno em 192.168.0.10 não abre desde ontem, sem mensagem de erro." }),
    expect: { [N.DET]: "alerta" }, known: true },
  { id: "det-excel-2019", desc: "'Excel 2019' é versão informada",
    form: com({ categoria: "Software", descricao: "Desde hoje o Excel 2019 trava ao abrir planilha grande no notebook; sem mensagem de erro; tentei reiniciar o computador." }),
    expect: { [N.DET]: "ok" }, known: true },

  // ───────────── Anexos, título, passos, categoria ─────────────
  { id: "anx-erro-sem-anexo", desc: "Erro citado e nenhum anexo",
    form: com({ anexos: "Nenhum" }), expect: { [N.ANX]: "alerta" } },
  { id: "tit-generico-5-palavras", desc: "Título longo, porém genérico",
    form: com({ titulo: "Erro no sistema de novo" }), expect: { [N.TIT]: "alerta" }, known: true },
  { id: "pas-palavras-chave-sem-sentido", desc: "Passos sem sentido que só contêm palavras-chave (limite das regex: exige análise semântica)",
    form: com({ passos: "1. Banana laranja abacaxi melancia uva\n2. Cachorro gato papagaio tartaruga coelho\n3. Segunda terça quarta quinta sexta\n4. Resolvido confirmado funcionou normalizado" }),
    expect: { [N.PAS]: "alerta" }, known: true },
  { id: "cat-teams-sugere-telefonia", desc: "Teams em chamada de vídeo não deve sugerir Telefonia VOIP",
    form: com({ categoria: "Software", titulo: "Teams trava durante a chamada de vídeo",
      descricao: "Desde hoje o Teams trava durante a chamada de vídeo no notebook com Windows 11. Aparece o erro 500. Tentei reiniciar o computador.",
      passos: "1. Reiniciei o notebook\n2. Testei a chamada com outro usuário\n3. Limpei o cache do Teams\n4. Confirmei com o usuário que a chamada normalizou" }),
    naoMencionar: { [N.CAT]: /telefonia/i }, known: true },

  // ───────────── Duplicidade ─────────────
  { id: "dup-identico", desc: "Ticket idêntico a um existente",
    form: com({}), tickets: [{ id: "t1", num: "TK-202610-0001", titulo: BASE.titulo, descricao: BASE.descricao, usuario: "Maria Souza", status: "Aberto" }],
    expect: { [N.DUP]: "alerta" } },
  { id: "dup-parafrase", desc: "Mesmo problema descrito com outras palavras (sinônimos)",
    form: com({ titulo: "Máquina do setor de Recursos Humanos sem ligar", categoria: "Hardware", descricao: "O desktop dos Recursos Humanos está sem ligar desde ontem; suspeita de fonte danificada, sem imagem no monitor." }),
    tickets: [{ id: "t1", num: "TK-202610-0001", titulo: "Computador do RH não liga", descricao: "O PC da sala do RH não liga desde ontem; a fonte parece queimada e o monitor fica sem sinal.", usuario: "Ana Paula", status: "Aberto" }],
    expect: { [N.DUP]: "alerta" }, known: true },
  { id: "dup-problema-diferente", desc: "Mesma impressora, problema diferente: não é duplicidade",
    form: com({ titulo: "Impressora do financeiro não liga", categoria: "Impressora", descricao: "A impressora do financeiro não liga; o painel permanece apagado e a luz de energia não acende." }),
    tickets: [{ id: "t1", num: "TK-202610-0001", titulo: "Impressora do financeiro não imprime", descricao: "A impressora do financeiro não imprime nenhuma página; fila de impressão travada.", usuario: "Maria Souza", status: "Aberto" }],
    expect: { [N.DUP]: "ok" } }
];
