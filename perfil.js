// ==============================================
//  SEU PERFIL — edite o texto entre aspas e salve
// ==============================================
perfil({
  nome: "Zalen",
  funcao: "Editor de vídeo",
  bio: "Clipes para raps geek, aberturas e reedits com ritmo, efeitos e cara de cinema.",

  // Frase grande que aparece no topo, depois do zoom nas letras
  chamada: "Edições que prendem do primeiro ao último frame.",

  // true = mostra "Aberto para novos projetos" no topo | false = esconde
  disponivel: true,

  // Preencha os que você usa. Os vazios ("") não aparecem no site.
  // Eles aparecem no rodapé de todas as telas, no player e na tela Contato.
  // O botão "Entrar em contato" do rodapé usa o e-mail (ou o WhatsApp, se não tiver e-mail).
  contato: {
    email: "",            // ex: "zalen@gmail.com"
    whatsapp: "",         // ex: "5511999999999" (com DDI e DDD, só números)
    youtube: "",          // ex: "https://youtube.com/@zalen"
    twitter: "",
    instagram: "",
    tiktok: "",
    discord: ""
  },

  // Cards "O que eu faço" da tela inicial.
  // colecao = pasta em clientes/ que abre no catálogo ao clicar em "Ver exemplos".
  servicos: [
    {
      titulo: "Clipes para raps geek",
      texto: "Edição na batida com anime, tipografia e efeitos para lançar sua música com impacto.",
      colecao: "comissoes"
    },
    {
      titulo: "Aberturas e intros",
      texto: "Vinhetas para canais e lives que deixam a sua marca na cabeça de quem assiste.",
      colecao: "7mz"
    },
    {
      titulo: "Reedits e colaborações",
      texto: "Novas versões de clipes e projetos em parceria com outros editores e artistas.",
      colecao: "reedits"
    }
  ],

  // Palavras que passam na faixa vermelha animada
  especialidades: ["Clipes para rap", "AMV", "Aberturas", "Reedits", "Motion", "Tipografia", "Sync na batida", "Efeitos"],

  // Passos de "Como funciona"
  processo: [
    { titulo: "Briefing", texto: "Você manda a música ou o vídeo, as referências e o prazo." },
    { titulo: "Direção", texto: "A gente alinha cenas, ritmo e estilo antes de começar." },
    { titulo: "Edição", texto: "Corte na batida, efeitos, tipografia e cor." },
    { titulo: "Entrega", texto: "Você confere o resultado e recebe pronto para postar." }
  ]
});
