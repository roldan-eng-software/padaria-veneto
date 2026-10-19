# Padaria Veneto — Landing Page

Página de vendas de uma via (one-page) para a **Padaria Veneto**, no Jardim Embaré, São Carlos/SP.
Arquivo único: `index.html` — HTML, CSS e JavaScript juntos, **sem build, sem dependências e sem framework**.

---

## Como usar

1. Dê duplo clique em `index.html` (abre no navegador) ou publique em qualquer host.
2. Para editar textos, horários, telefone e links, abra o `index.html` em um editor de texto e procure por **`const CONFIG`** (perto do fim do arquivo). Todos os dados do negócio estão lá.

---

## Dados já configurados (verificados no Google Maps)

| Campo | Valor |
|---|---|
| Nome | Padaria Veneto |
| Endereço | Av. João Orlando Ruggiero, 105 — Jardim Embaré, São Carlos/SP, 13563-840 |
| Telefone / WhatsApp | (16) 99368-5099 |
| Segunda a sexta | 06:00 – 19:00 |
| Sábado | 06:00 – 14:00 |
| Domingo | 06:30 – 12:00 |
| Avaliação | 4,7 ★ com 46 avaliações |
| Coordenadas | -21.970386, -47.931149 |

O selo **"Aberto agora / Fechado"** é calculado em tempo real no navegador do visitante, usando o fuso
`America/Sao_Paulo` e o bloco `CONFIG.hours`. A tabela de horários destaca automaticamente o dia de hoje.

---

## O que editar primeiro

### 1. Domínio

O site está publicado em **https://roldan-eng-software.github.io/padaria-veneto/**.

Quando registrar um domínio próprio, troque a URL atual em 3 lugares:

- `<link rel="canonical">`
- `og:url`
- campo `"url"` e `"@id"` dentro do bloco JSON-LD (`application/ld+json`)

Depois, no GitHub: **Settings → Pages → Custom domain**, aponte o DNS e marque *Enforce HTTPS*.

### 2. Delivery (opcional)

No `CONFIG`:

```js
delivery: {
  ifood: "",
  anotaai: "",
  propria: ""
}
```

Preencha o que existir. A faixa verde de delivery **só aparece** quando há pelo menos um link preenchido.

### 3. Mensuração (opcional)

```js
ga4: "",    // ex.: "G-XXXXXXXXXX"
pixel: ""   // ex.: "1234567890" (Meta Pixel)
```

Quando vazios, nenhum script de terceiros é carregado (melhor para a nota de performance).

Eventos já instrumentados: `whatsapp_click`, `phone_click`, `rota_click`, `encomenda_enviada`,
`delivery_click`, `mapa_aberto`, `galeria_ampliada`.

### 4. Fotos

As 7 fotos atuais são do **perfil da Padaria Veneto no Google Maps** (crédito no rodapé).
Para trocar por fotos próprias:

1. Suba as imagens para uma pasta `fotos/` junto do `index.html`.
2. No `index.html`, procure por `https://lh3.googleusercontent.com/grass-cs/` e substitua cada URL
   por `fotos/sua-foto.jpg`, ajustando o `alt`.
3. Para melhores resultados, salve as imagens em **WebP** com cerca de **1200 px de largura**.

> As fotos do Google são hospedadas pelo Google e podem sair do ar ou mudar de endereço.
> A página tem um `onerror` que troca imagens quebradas por um cartão com o nome da padaria —
> ela nunca fica com imagem quebrada, mas o ideal é hospedar as fotos você mesmo.

---

## Publicando

O site já está no ar via **GitHub Pages** (branch `main`, pasta raiz).
Qualquer `git push` na `main` republica automaticamente em 1–2 minutos.

Outros hosts estáticos também funcionam, porque é um arquivo único:

- **Netlify / Vercel:** arraste a pasta para o painel (https://app.netlify.com/drop).
- **Hostinger / cPanel:** envie o `index.html` para a pasta pública (`public_html`).

> O Pages exige repositório público no plano gratuito do GitHub. Se um dia o
> repositório voltar a ser privado, o site sai do ar até assinar o GitHub Pro
> ou publicar em outro host.

---

## Estrutura da página

1. Cabeçalho fixo com selo "Aberto agora" e botão de WhatsApp
2. Hero — nota 4,7 ★, CTA de WhatsApp + "Como chegar"
3. Faixa de confiança — nota, estacionamento, horário de abertura, Pix e cartões
4. Destaques — 6 cards de produto, cada um com CTA de WhatsApp
5. **Encomendas** — formulário que monta a mensagem e abre o WhatsApp já preenchido
6. Depoimentos — 4 avaliações reais do Google
7. A casa — história e diferenciais
8. Galeria — 7 fotos com lightbox
9. Onde estamos — endereço, horários, estacionamento e mapa (carregado sob demanda)
10. Perguntas frequentes
11. Faixa final de CTA, rodapé, botão flutuante e barra fixa no celular

---

## Acessibilidade e performance

- HTML semântico, um único `<h1>`, `alt` em todas as imagens
- Link "Pular para o conteúdo", foco visível, contraste AA
- `prefers-reduced-motion` desativa as animações
- Mapa carregado por clique (fachada) para não pesar no primeiro carregamento
- Imagens abaixo da dobra com `loading="lazy"`; hero com `srcset` e `fetchpriority="high"`
- Nenhuma requisição externa além das fontes do Google e das fotos

---

## Pendências e pontos a confirmar com a padaria

- Links de iFood / Anota AI / entrega própria
- Formas de pagamento aceitas (hoje o site informa Pix, débito e crédito — confirme)
- Se há **entrega própria** e qual a região atendida (hoje o FAQ direciona para o WhatsApp)
- Ano de fundação, se quiserem exibir tradição
- Prazo mínimo para encomendas grandes (hoje o FAQ orienta a confirmar pelo WhatsApp)

Se a padaria enviar **fotos próprias**, o resultado fica bem melhor: as imagens do Google
têm resolução e enquadramento limitados.
