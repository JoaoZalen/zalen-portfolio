// ==============================================
//  SEU PERFIL — edite o texto entre aspas e salve
// ==============================================
perfil({
  nome: "Zalen",
  funcao: "Editor de vídeo",
  bio: "Clipes, aberturas e reedits.",

  // Frase grande que aparece no topo, depois do zoom nas letras
  chamada: "Edições que prendem.",

  // true = mostra "Disponível" no topo | false = esconde
  disponivel: true,

  // Preencha os que você usa. Os vazios ("") não aparecem no site.
  // Eles aparecem no rodapé de todas as telas, no player e na tela Contato.
  // O botão "Contato" do rodapé usa o e-mail (ou o WhatsApp, se não tiver e-mail).
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
  // colecao = pasta em clientes/ que abre no catálogo ao clicar em "Exemplos".
  servicos: [
    {
      titulo: "Clipes de rap",
      texto: "Anime e efeitos na batida.",
      colecao: "comissoes"
    },
    {
      titulo: "Aberturas",
      texto: "Intros para canais e lives.",
      colecao: "7mz"
    },
    {
      titulo: "Reedits",
      texto: "Novas versões e parcerias.",
      colecao: "reedits"
    }
  ],

  // Palavras que passam na faixa vermelha animada
  especialidades: ["Clipes", "AMV", "Aberturas", "Reedits", "Motion"],

  // Passos de "Como funciona"
  processo: [
    { titulo: "Briefing", texto: "Música, referências e prazo." },
    { titulo: "Direção", texto: "Cenas, ritmo e estilo." },
    { titulo: "Edição", texto: "Corte, efeitos e cor." },
    { titulo: "Entrega", texto: "Pronto para postar." }
  ]
});
