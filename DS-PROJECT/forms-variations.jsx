/* forms-variations.jsx — three field-form mockups inside a design canvas */

const { useState } = React;

// =================================================================
// Shared SVG icons (small set so we don't depend on an icon library)
// =================================================================
const Icon = {
  mic: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>,
  camera: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg>,
  whatsapp: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.93.55 3.73 1.5 5.27L2 22l4.95-1.59a9.85 9.85 0 0 0 5.08 1.4h.01c5.46 0 9.91-4.45 9.91-9.9 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2zm0 18.13c-1.5 0-2.97-.4-4.25-1.17l-.3-.18-3.16 1 .85-3.07-.2-.32a8.14 8.14 0 0 1-1.26-4.38c0-4.53 3.69-8.22 8.23-8.22 2.2 0 4.26.86 5.82 2.41a8.16 8.16 0 0 1 2.41 5.82c0 4.54-3.7 8.22-8.23 8.22zm4.51-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.13-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.99-1.23a7.5 7.5 0 0 1-1.38-1.72c-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43h-.48c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/></svg>,
  send: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg>,
  download: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  bell: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  mail: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>,
  phone: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M12 18h.01"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  user: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  pause: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  faceGood: () => <svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.75"/><path d="M12 21c1.5 2 3.7 3 6 3s4.5-1 6-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><circle cx="13" cy="14" r="1.4" fill="currentColor"/><circle cx="23" cy="14" r="1.4" fill="currentColor"/></svg>,
  faceMid: () => <svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.75"/><line x1="12" y1="22" x2="24" y2="22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><circle cx="13" cy="14" r="1.4" fill="currentColor"/><circle cx="23" cy="14" r="1.4" fill="currentColor"/></svg>,
  faceLow: () => <svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.75"/><path d="M12 24c1.5-2 3.7-3 6-3s4.5 1 6 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><circle cx="13" cy="14" r="1.4" fill="currentColor"/><circle cx="23" cy="14" r="1.4" fill="currentColor"/></svg>,
  waveform: () => <svg viewBox="0 0 200 30" fill="none">{Array.from({length: 50}).map((_, i) => {
    const h = 4 + (Math.sin(i * 0.6) * 0.5 + 0.5) * 18 + (Math.random() * 6);
    return <rect key={i} x={i * 4} y={15 - h/2} width="2" height={h} rx="1" fill="currentColor" />
  })}</svg>,
};

// Phone status bar
function StatusBar({ dark }) {
  const color = dark ? 'var(--shema-branco)' : 'var(--shema-verde)';
  return (
    <div className="fma-statusbar" style={{ color }}>
      <span>09:42</span>
      <span className="fma-dot"><span/><span/><span/><span style={{ width: 18, height: 8, borderRadius: 2, border: `1.5px solid ${color}`, background: 'transparent' }}/></span>
    </div>
  );
}

// =================================================================
// VARIATION A — PULSO MENSAL — short, cream, conversational
// =================================================================
function VariationA() {
  return (
    <div className="fma-frame">
      <StatusBar />
      <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="design-system/assets/icon-verde.svg" width="22" height="22" alt=""/>
          <span style={{ font: '700 13px/1 var(--font-sans)', letterSpacing: '0.02em', color: 'var(--shema-verde)' }}>shemá</span>
        </div>
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-subtle)' }}>Maio · 2026</span>
      </div>

      <div className="fma-scroll">
        <div className="fma-pad">
          {/* Greeting */}
          <p className="fma-h-eyebrow">Pulso mensal</p>
          <h1 className="fma-h-title">Oi, Fresia.<br/>Como foi o mês em Aurora?</h1>
          <p className="fma-h-sub">Cinco perguntas curtas sobre o projeto Asháninka. Pode levar 3 minutos.</p>

          <div style={{ marginTop: 22 }} className="fma-progress">
            <span className="fma-on"/><span className="fma-on"/><span className="fma-on"/><span/><span/>
          </div>

          {/* Q1 — heart of the team */}
          <div className="fma-section-label"><span className="fma-num">01</span> <span>Coração da equipe</span></div>
          <h3 className="fma-q">Como vocês estão se sentindo?</h3>
          <div className="fma-faces">
            <div className="fma-face" style={{ color: '#7a8a4a' }}>
              <Icon.faceGood/>
              <span className="fma-face-label">Bem</span>
            </div>
            <div className="fma-face fma-selected" style={{ color: 'var(--shema-telha)' }}>
              <Icon.faceMid/>
              <span className="fma-face-label">Cansados</span>
            </div>
            <div className="fma-face" style={{ color: 'var(--fg-muted)' }}>
              <Icon.faceLow/>
              <span className="fma-face-label">Difícil</span>
            </div>
          </div>

          {/* Q2 — progress numbers */}
          <div className="fma-section-label"><span className="fma-num">02</span> <span>Progresso de tradução</span></div>
          <h3 className="fma-q">Quantos capítulos vocês fecharam este mês?</h3>
          <p className="fma-hint">Da última vez, vocês estavam em 32 capítulos traduzidos.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="fma-counter">
              <div>
                <div className="fma-counter-label">Traduzidos</div>
                <div className="fma-counter-label-sub">era 32 · agora</div>
              </div>
              <div className="fma-counter-ctl">
                <button className="fma-counter-btn">−</button>
                <span className="fma-counter-val">36</span>
                <button className="fma-counter-btn">+</button>
              </div>
            </div>
            <div className="fma-counter">
              <div>
                <div className="fma-counter-label">Checados na comunidade</div>
                <div className="fma-counter-label-sub">era 18 · agora</div>
              </div>
              <div className="fma-counter-ctl">
                <button className="fma-counter-btn">−</button>
                <span className="fma-counter-val">22</span>
                <button className="fma-counter-btn">+</button>
              </div>
            </div>
            <div className="fma-counter">
              <div>
                <div className="fma-counter-label">Aprovados pelo Daniel</div>
                <div className="fma-counter-label-sub">era 12 · agora</div>
              </div>
              <div className="fma-counter-ctl">
                <button className="fma-counter-btn">−</button>
                <span className="fma-counter-val">14</span>
                <button className="fma-counter-btn">+</button>
              </div>
            </div>
          </div>

          {/* Q3 — needs */}
          <div className="fma-section-label"><span className="fma-num">03</span> <span>Faltas e necessidades</span></div>
          <h3 className="fma-q">Tem alguma falta atrapalhando agora?</h3>
          <p className="fma-hint">Toque em tudo que se aplica.</p>
          <div className="fma-chips">
            <span className="fma-chip fma-urgent">Recursos · urgente</span>
            <span className="fma-chip">Equipamento</span>
            <span className="fma-chip fma-on">Treinamento</span>
            <span className="fma-chip">Voluntários</span>
            <span className="fma-chip">Logística</span>
            <span className="fma-chip">Conectividade</span>
            <span className="fma-chip">Tudo certo</span>
          </div>

          {/* Q4 — prayer */}
          <div className="fma-section-label"><span className="fma-num">04</span> <span>Pedido de oração</span></div>
          <h3 className="fma-q">O que vocês querem levar em oração?</h3>
          <textarea className="fma-input fma-textarea" placeholder="Pode escrever, ou gravar um áudio abaixo." defaultValue="Pelos anciões da aldeia, que recebem os trechos do Evangelho de João nesta semana. Por força física dos tradutores na estiagem."/>
          <div style={{ height: 10 }}/>
          <div className="fma-voice">
            <div className="fma-mic"><Icon.mic width="22" height="22"/></div>
            <div>
              <div className="fma-voice-label">Gravar um áudio</div>
              <div className="fma-voice-sub">até 2 min · fica anexo ao envio</div>
            </div>
          </div>

          {/* Q5 — photo */}
          <div className="fma-section-label"><span className="fma-num">05</span> <span>Uma foto do mês</span></div>
          <h3 className="fma-q">Compartilhe um momento.</h3>
          <p className="fma-hint">Equipe, ancião lendo, momento de entrega, treinamento. Opcional.</p>
          <div className="fma-photo-thumb">
            <span className="fma-photo-cap">Mostrar foto carregada aqui</span>
          </div>

          {/* Notify confirmation */}
          <div className="fma-notify">
            <div className="fma-notify-icon"><Icon.bell width="16" height="16"/></div>
            <div className="fma-notify-text">
              <div className="fma-notify-title">Avisaremos a coordenação ao enviar.</div>
              <div className="fma-notify-sub">Karina · email + push · responde em até 24h</div>
            </div>
            <label className="fma-switch"><input type="checkbox" defaultChecked/><span/></label>
          </div>

          {/* CTAs */}
          <div className="fma-foot">
            <button className="fma-btn fma-btn-primary">
              <Icon.send width="16" height="16"/>
              Enviar à coordenação
            </button>
            <button className="fma-btn fma-btn-ghost">
              <Icon.whatsapp width="16" height="16"/>
              Compartilhar pelo WhatsApp
            </button>
            <p className="fma-foot-note">Tudo é salvo automaticamente. Pode fechar e voltar depois.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// VARIATION B — CONTA O MÊS — multimodal, stories-style, dark
// =================================================================
function VariationB() {
  return (
    <div className="fma-frame fmb-frame">
      <div className="fma-statusbar fmb-statusbar">
        <span>09:42</span>
        <span className="fma-dot"><span/><span/><span/><span style={{ width: 18, height: 8, borderRadius: 2, border: '1.5px solid currentColor', background: 'transparent' }}/></span>
      </div>

      <div className="fmb-topbar">
        <div className="fmb-logo">
          <img className="fmb-logo-mark" src="design-system/assets/icon-branco.svg" alt=""/>
          <span className="fmb-logo-name">shemá · campo</span>
        </div>
        <div className="fmb-step-dots">
          <span className="fmb-done"/><span className="fmb-done"/><span className="fmb-on"/><span/><span/>
        </div>
      </div>

      <div className="fma-scroll">
        <div className="fmb-header">
          <p className="fmb-eyebrow">Maio · Asháninka · YWAM Aurora</p>
          <h1 className="fmb-title">Conta o mês,<br/>Fresia.</h1>
          <p className="fmb-sub">Em três formas: <strong style={{color:'var(--shema-branco)'}}>sua voz</strong>, uma <strong style={{color:'var(--shema-branco)'}}>foto</strong>, alguns <strong style={{color:'var(--shema-branco)'}}>números</strong>. A coordenação cuida do resto.</p>
        </div>

        {/* Card 1 — Voice */}
        <div className="fmb-card">
          <div className="fmb-card-step">01 · Sua voz</div>
          <h2 className="fmb-card-title">Como foi este mês?</h2>
          <p className="fmb-card-prompt">Fale do que importa — não precisa ser perfeito. A gente escuta inteiro.</p>
          <button className="fmb-action-big">
            <Icon.mic/>
            <span className="fmb-action-label">TOCAR PARA GRAVAR</span>
            <span className="fmb-action-meta">até 5 minutos</span>
          </button>
          <div className="fmb-record-bar">
            <Icon.pause width="14" height="14"/>
            <span className="fmb-record-bar-text">áudio_fresia_mai.m4a</span>
            <span className="fmb-record-bar-time">2:14</span>
          </div>
          <div style={{ marginTop: 10, color: 'var(--shema-telha)' }}>
            <Icon.waveform/>
          </div>
        </div>

        {/* Card 2 — Photos */}
        <div className="fmb-card">
          <div className="fmb-card-step">02 · Uma foto (ou três)</div>
          <h2 className="fmb-card-title">Mostre o trabalho.</h2>
          <p className="fmb-card-prompt">Equipe, anciões, evento, material impresso. Até 4 fotos.</p>
          <div className="fmb-photo-grid">
            <div className="fmb-photo" style={{ background: 'linear-gradient(135deg, var(--shema-telha), var(--shema-verde-claro))' }}/>
            <div className="fmb-photo" style={{ background: 'linear-gradient(160deg, #8a6a3a, var(--shema-telha))' }}/>
            <div className="fmb-photo" style={{ background: 'linear-gradient(200deg, var(--shema-verde-claro), #4a5a30)' }}/>
            <div className="fmb-photo fmb-add">+</div>
          </div>
        </div>

        {/* Card 3 — Numbers */}
        <div className="fmb-card">
          <div className="fmb-card-step">03 · Os números</div>
          <h2 className="fmb-card-title">Capítulos fechados.</h2>
          <p className="fmb-card-prompt">Sobre o Evangelho de João — vocês estavam em 32.</p>
          <div className="fmb-num-grid">
            <div className="fmb-num">
              <div className="fmb-num-val">36</div>
              <div className="fmb-num-label">Traduzido</div>
              <div className="fmb-num-delta">+4</div>
            </div>
            <div className="fmb-num">
              <div className="fmb-num-val">22</div>
              <div className="fmb-num-label">Comunidade</div>
              <div className="fmb-num-delta">+4</div>
            </div>
            <div className="fmb-num">
              <div className="fmb-num-val">14</div>
              <div className="fmb-num-label">Aprovado</div>
              <div className="fmb-num-delta">+2</div>
            </div>
          </div>
        </div>

        {/* Card 4 — Needs */}
        <div className="fmb-card">
          <div className="fmb-card-step">04 · Faltas</div>
          <h2 className="fmb-card-title">Atrapalha algo?</h2>
          <p className="fmb-card-prompt">Toque o que falta esta semana.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="fmb-chip-dark fmb-on">Recursos</span>
            <span className="fmb-chip-dark">Equipamento</span>
            <span className="fmb-chip-dark fmb-on">Treinamento</span>
            <span className="fmb-chip-dark">Voluntários</span>
            <span className="fmb-chip-dark">Material</span>
            <span className="fmb-chip-dark">Conectividade</span>
            <span className="fmb-chip-dark">Logística</span>
          </div>
        </div>

        {/* Card 5 — Prayer */}
        <div className="fmb-card">
          <div className="fmb-card-step">05 · Pedido de oração</div>
          <h2 className="fmb-card-title">O que levamos em oração?</h2>
          <p className="fmb-card-prompt">Conte o que vocês querem que a rede leve a Deus. Escreva, ou grave em áudio.</p>
          <textarea className="fma-input" rows="3" style={{ background: 'rgba(246,245,235,0.08)', border: '1px solid rgba(246,245,235,0.18)', color: 'var(--shema-branco)', resize: 'none' }} defaultValue="Pelos anciões da aldeia que recebem o Evangelho de João nesta semana. Por descanso e força física dos tradutores na estiagem."/>
          <div className="fmb-record-bar" style={{ marginTop: 12 }}>
            <Icon.mic width="16" height="16"/>
            <span className="fmb-record-bar-text">Gravar pedido em áudio</span>
            <span className="fmb-record-bar-time">até 2 min</span>
          </div>
        </div>
      </div>

      <div className="fmb-notify">
        <Icon.bell width="14" height="14"/>
        <span className="fmb-notify-text">Karina será avisada — email + push</span>
        <label className="fmb-switch"><input type="checkbox" defaultChecked/><span/></label>
      </div>

      <div className="fmb-foot">
        <button className="fmb-cta-ghost"><Icon.whatsapp width="20" height="20"/></button>
        <button className="fmb-cta">ENVIAR ATUALIZAÇÃO</button>
      </div>
    </div>
  );
}

// =================================================================
// VARIATION C — CARTA AO MENTOR — editorial, serif, letter-style
// =================================================================
function VariationC() {
  return (
    <div className="fma-frame fmc-frame">
      <StatusBar />
      <div style={{ padding: '12px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="design-system/assets/icon-verde.svg" width="20" height="20" alt=""/>
        <span style={{ font: '500 11px/1 var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>Pulso mensal · Maio 2026</span>
      </div>

      <div className="fma-scroll">
        <div className="fmc-paper">
          <div className="fmc-meta">
            <span>Aurora · Asháninka</span>
            <span>14 de maio</span>
          </div>

          <h1 className="fmc-greeting">Caro Daniel,</h1>
          <p className="fmc-greeting-sub">Mentor da equipe Asháninka — YWAM Aurora</p>

          <div className="fmc-field-block">
            <p className="fmc-prompt"><em>Este mês,</em> o que mais marcou em Aurora foi…</p>
            <span className="fmc-fillline fmc-fillline-multi">A entrega dos primeiros 4 capítulos de João aos anciões da aldeia. Houve oração ao final, e a Joana chorou ao ler a primeira página em sua língua.</span>
          </div>

          <div className="fmc-field-block">
            <p className="fmc-prompt"><em>O coração da equipe</em> está…</p>
            <span className="fmc-fillline">cansado mas firme. Precisamos de descanso.</span>
          </div>

          <div className="fmc-field-block">
            <p className="fmc-prompt"><em>Se você pudesse pedir uma coisa</em> à coordenação, seria…</p>
            <span className="fmc-fillline fmc-fillline-multi">um treinamento de checagem narrativa para a Marina, que está assumindo as revisões. E recursos para a próxima visita de campo em junho.</span>
          </div>

          <div className="fmc-field-block">
            <p className="fmc-prompt"><em>Levem em oração</em>…</p>
            <span className="fmc-fillline fmc-fillline-multi">os anciões que estão lendo. E a estiagem — está mais longa este ano.</span>
          </div>

          <div className="fmc-divider">
            <span className="fmc-divider-rule"/>
            <span className="fmc-divider-text">Para o registro</span>
            <span className="fmc-divider-rule"/>
          </div>

          <div className="fmc-ledger">
            <div className="fmc-ledger-cell">
              <div className="fmc-ledger-label">Traduzido</div>
              <div className="fmc-ledger-val">36 <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>caps</span></div>
              <div className="fmc-ledger-meta">+4 desde abril</div>
            </div>
            <div className="fmc-ledger-cell">
              <div className="fmc-ledger-label">Comunidade</div>
              <div className="fmc-ledger-val">22 <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>caps</span></div>
              <div className="fmc-ledger-meta">+4 desde abril</div>
            </div>
            <div className="fmc-ledger-cell">
              <div className="fmc-ledger-label">Aprovado</div>
              <div className="fmc-ledger-val">14 <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>caps</span></div>
              <div className="fmc-ledger-meta">+2 desde abril</div>
            </div>
            <div className="fmc-ledger-cell">
              <div className="fmc-ledger-label">Saúde</div>
              <div className="fmc-ledger-val" style={{ font: '600 16px/1.1 var(--font-sans)', color: 'var(--shema-telha)' }}>Atenção</div>
              <div className="fmc-ledger-meta">cansaço da equipe</div>
            </div>
          </div>

          <div className="fmc-sign">
            <p className="fmc-sign-line">Com gratidão,</p>
            <p className="fmc-sign-name">Fresia</p>
            <p className="fmc-sign-role">Líder · Asháninka · YWAM Aurora</p>
          </div>

          <div className="fmc-versicle">
            <p className="fmc-versicle-text">"Assim na terra como no céu."</p>
            <p className="fmc-versicle-ref">Mateus 6:10</p>
          </div>
        </div>

        <div className="fmc-cta-row">
          <button className="fmc-cta fmc-cta-ghost">
            <Icon.whatsapp width="16" height="16"/>
            WhatsApp
          </button>
          <button className="fmc-cta fmc-cta-primary">
            Selar e enviar
            <Icon.arrow width="14" height="14"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// VARIATION D — NOTIFICAÇÕES (coordenação)
// =================================================================
function VariationNotify() {
  return (
    <div className="fma-frame fmn-frame">
      <StatusBar />
      <div className="fmn-topbar">
        <button className="fmn-back">←</button>
        <span className="fmn-topbar-title">Configurações</span>
        <span style={{ width: 24 }}/>
      </div>

      <div className="fma-scroll">
        <div className="fmn-pad">
          <p className="fma-h-eyebrow">Coordenação · Karina</p>
          <h1 className="fma-h-title">Notificações do campo.</h1>
          <p className="fma-h-sub">Avise-me sempre que uma equipe enviar um formulário mensal. Eu escolho como e quando.</p>

          {/* Master toggle */}
          <div className="fmn-masterbox">
            <div className="fmn-masterbox-icon"><Icon.bell width="22" height="22"/></div>
            <div style={{ flex: 1 }}>
              <div className="fmn-masterbox-title">Notificar a cada envio</div>
              <div className="fmn-masterbox-sub">Ativo · funciona em todos os projetos</div>
            </div>
            <label className="fma-switch fma-switch-lg"><input type="checkbox" defaultChecked/><span/></label>
          </div>

          {/* Channels */}
          <div className="fma-section-label"><span className="fma-num">01</span> <span>Onde quero receber</span></div>
          <div className="fmn-list">
            <div className="fmn-row fmn-row-on">
              <div className="fmn-row-icon"><Icon.mail width="18" height="18"/></div>
              <div className="fmn-row-text">
                <div className="fmn-row-title">Email</div>
                <div className="fmn-row-sub">karina@shema.org · resumo do formulário no corpo</div>
              </div>
              <label className="fma-switch"><input type="checkbox" defaultChecked/><span/></label>
            </div>
            <div className="fmn-row fmn-row-on">
              <div className="fmn-row-icon"><Icon.phone width="18" height="18"/></div>
              <div className="fmn-row-text">
                <div className="fmn-row-title">Push neste aparelho</div>
                <div className="fmn-row-sub">iPhone de Karina · ativo</div>
              </div>
              <label className="fma-switch"><input type="checkbox" defaultChecked/><span/></label>
            </div>
            <div className="fmn-row">
              <div className="fmn-row-icon"><Icon.whatsapp width="18" height="18"/></div>
              <div className="fmn-row-text">
                <div className="fmn-row-title">WhatsApp</div>
                <div className="fmn-row-sub">+55 11 9•••• ‑1234 · mensagem com link do formulário</div>
              </div>
              <label className="fma-switch"><input type="checkbox"/><span/></label>
            </div>
          </div>

          {/* When */}
          <div className="fma-section-label"><span className="fma-num">02</span> <span>Quando avisar</span></div>
          <div className="fmn-radiogroup">
            <label className="fmn-radio fmn-radio-on">
              <span className="fmn-radio-dot"/>
              <div>
                <div className="fmn-radio-title">Na hora</div>
                <div className="fmn-radio-sub">Cada formulário gera uma notificação imediata.</div>
              </div>
            </label>
            <label className="fmn-radio">
              <span className="fmn-radio-dot"/>
              <div>
                <div className="fmn-radio-title">Só os urgentes</div>
                <div className="fmn-radio-sub">Saúde crítica, pedido urgente, sem notícias 60+ dias.</div>
              </div>
            </label>
            <label className="fmn-radio">
              <span className="fmn-radio-dot"/>
              <div>
                <div className="fmn-radio-title">Resumo diário</div>
                <div className="fmn-radio-sub">Um digest às 08h com tudo que chegou no dia.</div>
              </div>
            </label>
          </div>

          {/* Projects scope */}
          <div className="fma-section-label"><span className="fma-num">03</span> <span>Quais projetos</span></div>
          <div className="fmn-scope">
            <div className="fmn-scope-row fmn-scope-row-on">
              <div className="fmn-scope-radio"><Icon.check width="12" height="12"/></div>
              <div>
                <div className="fmn-scope-title">Todos os 47 projetos</div>
                <div className="fmn-scope-sub">Padrão da coordenação</div>
              </div>
            </div>
            <div className="fmn-scope-row">
              <div className="fmn-scope-radio"/>
              <div>
                <div className="fmn-scope-title">Só projetos que mentoro</div>
                <div className="fmn-scope-sub">12 línguas — Karina como mentora</div>
              </div>
            </div>
            <div className="fmn-scope-row">
              <div className="fmn-scope-radio"/>
              <div>
                <div className="fmn-scope-title">Lista personalizada</div>
                <div className="fmn-scope-sub">Escolher projetos manualmente</div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="fma-section-label"><span className="fma-num">04</span> <span>Pré-visualização</span></div>
          <div className="fmn-preview">
            <div className="fmn-preview-app">
              <img src="design-system/assets/icon-verde.svg" width="18" height="18" alt=""/>
              <span className="fmn-preview-app-name">Shemá</span>
              <span className="fmn-preview-app-time">agora</span>
            </div>
            <div className="fmn-preview-title">Fresia enviou o pulso de maio</div>
            <div className="fmn-preview-body"><strong>Asháninka · YWAM Aurora</strong> — +4 capítulos traduzidos, equipe cansada mas firme, pedindo treinamento de checagem.</div>
            <div className="fmn-preview-tags">
              <span className="fmn-tag">+4 caps</span>
              <span className="fmn-tag fmn-tag-warn">cansaço</span>
              <span className="fmn-tag fmn-tag-need">treinamento</span>
            </div>
          </div>

          {/* Recent log */}
          <div className="fma-section-label"><span className="fma-num">05</span> <span>Últimas notificações</span></div>
          <div className="fmn-log">
            <div className="fmn-log-row">
              <div className="fmn-log-dot fmn-log-dot-new"/>
              <div style={{ flex: 1 }}>
                <div className="fmn-log-title">Fresia · Asháninka</div>
                <div className="fmn-log-sub">Pulso mensal recebido</div>
              </div>
              <span className="fmn-log-time">há 2h</span>
            </div>
            <div className="fmn-log-row">
              <div className="fmn-log-dot"/>
              <div style={{ flex: 1 }}>
                <div className="fmn-log-title">Edwin · Awa-Cuaiquer</div>
                <div className="fmn-log-sub">Pulso mensal recebido</div>
              </div>
              <span className="fmn-log-time">ontem</span>
            </div>
            <div className="fmn-log-row">
              <div className="fmn-log-dot"/>
              <div style={{ flex: 1 }}>
                <div className="fmn-log-title">Anabel · Baikeno</div>
                <div className="fmn-log-sub">Pulso mensal recebido</div>
              </div>
              <span className="fmn-log-time">3 dias</span>
            </div>
            <div className="fmn-log-row">
              <div className="fmn-log-dot fmn-log-dot-urgent"/>
              <div style={{ flex: 1 }}>
                <div className="fmn-log-title">Lidia · Banawa</div>
                <div className="fmn-log-sub">Pedido urgente · recursos</div>
              </div>
              <span className="fmn-log-time">5 dias</span>
            </div>
          </div>

          <div className="fma-foot">
            <button className="fma-btn fma-btn-primary">
              <Icon.check width="16" height="16"/>
              Salvar preferências
            </button>
            <p className="fma-foot-note">Você pode mudar a qualquer momento em Configurações.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// VARIATION E — SAÚDE DA EQUIPE · OBT LAB (durante reunião online)
// =================================================================
function VariationE() {
  return (
    <div className="fma-frame fme-frame">
      <StatusBar />
      {/* Meeting bar */}
      <div className="fme-meetbar">
        <span className="fme-livedot"/>
        <span className="fme-meetbar-text">Reunião ao vivo · Zoom</span>
        <span className="fme-meetbar-time">38:14</span>
        <div className="fme-participants">
          <span className="fme-avatar" style={{ background: '#9c6b3a' }}>F</span>
          <span className="fme-avatar" style={{ background: 'var(--shema-verde-claro)' }}>M</span>
          <span className="fme-avatar" style={{ background: '#7a5a3a' }}>T</span>
          <span className="fme-avatar fme-avatar-more">+2</span>
        </div>
      </div>

      <div className="fma-scroll">
        <div className="fme-pad">
          <p className="fma-h-eyebrow">Avaliação de Saúde · OBT Lab</p>
          <h1 className="fma-h-title">Como está a equipe<br/>Asháninka?</h1>
          <p className="fma-h-sub">Conduzida por <strong style={{ color: 'var(--shema-preto)', fontStyle: 'normal' }}>Daniel</strong> · com a equipe de Fresia em YWAM Aurora · 14 mai 2026</p>

          <div className="fme-howto">
            <div className="fme-howto-icon">i</div>
            <div>
              <div className="fme-howto-title">Como usar este roteiro</div>
              <div className="fme-howto-text">Cada dimensão tem perguntas-guia para conversar com a equipe. Avalie ao final de cada bloco e anote o que ouviu. Tudo é compartilhado com a Karina ao salvar.</div>
            </div>
          </div>

          {/* ===== 1 EMOCIONAL ===== */}
          <div className="fme-dim">
            <div className="fme-dim-head">
              <span className="fme-dim-num">01 / 04</span>
              <span className="fme-dim-cat fme-cat-emo">Emocional</span>
            </div>
            <h2 className="fme-dim-q">Como vocês estão sentindo o coração?</h2>
            <div className="fme-prompts">
              <div className="fme-prompts-label">O que perguntar</div>
              <ul className="fme-prompts-list">
                <li>Como vocês têm dormido este mês?</li>
                <li>Algo está tirando o sono ou a paz?</li>
                <li>Onde vocês têm achado descanso?</li>
                <li>Há alguma situação pessoal pesando agora?</li>
              </ul>
            </div>
            <div className="fme-rating">
              <button className="fme-rate fme-rate-good">
                <span className="fme-rate-icon"><Icon.faceGood/></span>
                <span className="fme-rate-label">Boa</span>
              </button>
              <button className="fme-rate fme-rate-warn fme-rate-on">
                <span className="fme-rate-icon"><Icon.faceMid/></span>
                <span className="fme-rate-label">Atenção</span>
              </button>
              <button className="fme-rate fme-rate-crit">
                <span className="fme-rate-icon"><Icon.faceLow/></span>
                <span className="fme-rate-label">Crítica</span>
              </button>
            </div>
            <textarea className="fma-input fma-textarea fme-notes" placeholder="O que você ouviu nesta dimensão…" defaultValue="Fresia relatou cansaço acumulado. Marina dorme bem mas chora com facilidade. Tomás sente o peso da liderança espiritual da aldeia."/>
          </div>

          {/* ===== 2 RELACIONAL ===== */}
          <div className="fme-dim">
            <div className="fme-dim-head">
              <span className="fme-dim-num">02 / 04</span>
              <span className="fme-dim-cat fme-cat-rel">Relacional</span>
            </div>
            <h2 className="fme-dim-q">Como estão as relações entre vocês?</h2>
            <div className="fme-prompts">
              <div className="fme-prompts-label">O que perguntar</div>
              <ul className="fme-prompts-list">
                <li>Vocês têm tido conflitos sem resolver?</li>
                <li>Como estão se cuidando uns dos outros?</li>
                <li>Há alguém isolado da equipe?</li>
                <li>Como está a relação com a comunidade local?</li>
              </ul>
            </div>
            <div className="fme-rating">
              <button className="fme-rate fme-rate-good fme-rate-on">
                <span className="fme-rate-icon"><Icon.faceGood/></span>
                <span className="fme-rate-label">Boa</span>
              </button>
              <button className="fme-rate fme-rate-warn">
                <span className="fme-rate-icon"><Icon.faceMid/></span>
                <span className="fme-rate-label">Atenção</span>
              </button>
              <button className="fme-rate fme-rate-crit">
                <span className="fme-rate-icon"><Icon.faceLow/></span>
                <span className="fme-rate-label">Crítica</span>
              </button>
            </div>
            <textarea className="fma-input fma-textarea fme-notes" placeholder="O que você ouviu nesta dimensão…" defaultValue="Equipe coesa. Boa relação com os anciões da aldeia. Sem conflitos relatados."/>
          </div>

          {/* ===== 3 ESPIRITUAL ===== */}
          <div className="fme-dim">
            <div className="fme-dim-head">
              <span className="fme-dim-num">03 / 04</span>
              <span className="fme-dim-cat fme-cat-esp">Espiritual</span>
            </div>
            <h2 className="fme-dim-q">Como está o caminhar com Deus?</h2>
            <div className="fme-prompts">
              <div className="fme-prompts-label">O que perguntar</div>
              <ul className="fme-prompts-list">
                <li>Como tem sido a vida de oração da equipe?</li>
                <li>Vocês conseguem se reunir para adorar?</li>
                <li>O que Deus está falando no projeto agora?</li>
                <li>Há alguma área de batalha espiritual?</li>
              </ul>
            </div>
            <div className="fme-rating">
              <button className="fme-rate fme-rate-good fme-rate-on">
                <span className="fme-rate-icon"><Icon.faceGood/></span>
                <span className="fme-rate-label">Boa</span>
              </button>
              <button className="fme-rate fme-rate-warn">
                <span className="fme-rate-icon"><Icon.faceMid/></span>
                <span className="fme-rate-label">Atenção</span>
              </button>
              <button className="fme-rate fme-rate-crit">
                <span className="fme-rate-icon"><Icon.faceLow/></span>
                <span className="fme-rate-label">Crítica</span>
              </button>
            </div>
            <textarea className="fma-input fma-textarea fme-notes" placeholder="O que você ouviu nesta dimensão…" defaultValue="Oração às 5h é mantida. Relato de palavras proféticas sobre a entrega de João. Boa.‎"/>
          </div>

          {/* ===== 4 FÍSICA ===== */}
          <div className="fme-dim">
            <div className="fme-dim-head">
              <span className="fme-dim-num">04 / 04</span>
              <span className="fme-dim-cat fme-cat-fis">Física</span>
            </div>
            <h2 className="fme-dim-q">Como está a saúde física?</h2>
            <div className="fme-prompts">
              <div className="fme-prompts-label">O que perguntar</div>
              <ul className="fme-prompts-list">
                <li>Alguém com problemas de saúde agora?</li>
                <li>Como está a alimentação? Acesso à água?</li>
                <li>Vocês têm conseguido descansar fisicamente?</li>
                <li>Algum risco de segurança no território?</li>
              </ul>
            </div>
            <div className="fme-rating">
              <button className="fme-rate fme-rate-good">
                <span className="fme-rate-icon"><Icon.faceGood/></span>
                <span className="fme-rate-label">Boa</span>
              </button>
              <button className="fme-rate fme-rate-warn fme-rate-on">
                <span className="fme-rate-icon"><Icon.faceMid/></span>
                <span className="fme-rate-label">Atenção</span>
              </button>
              <button className="fme-rate fme-rate-crit">
                <span className="fme-rate-icon"><Icon.faceLow/></span>
                <span className="fme-rate-label">Crítica</span>
              </button>
            </div>
            <textarea className="fma-input fma-textarea fme-notes" placeholder="O que você ouviu nesta dimensão…" defaultValue="Estiagem está afetando o acesso à água. Marina com dores de cabeça frequentes — pode ser desidratação. Recomendar avaliação médica."/>
          </div>

          {/* ===== SUMMARY ===== */}
          <div className="fme-summary">
            <div className="fme-summary-head">
              <span className="fma-h-eyebrow" style={{ margin: 0, color: 'var(--shema-branco)' }}>Resumo da avaliação</span>
              <span className="fme-overall">Atenção</span>
            </div>
            <div className="fme-summary-grid">
              <div className="fme-summary-cell">
                <div className="fme-summary-label">Emocional</div>
                <div className="fme-summary-dot fme-summary-dot-warn"/>
                <div className="fme-summary-status">Atenção</div>
              </div>
              <div className="fme-summary-cell">
                <div className="fme-summary-label">Relacional</div>
                <div className="fme-summary-dot fme-summary-dot-good"/>
                <div className="fme-summary-status">Boa</div>
              </div>
              <div className="fme-summary-cell">
                <div className="fme-summary-label">Espiritual</div>
                <div className="fme-summary-dot fme-summary-dot-good"/>
                <div className="fme-summary-status">Boa</div>
              </div>
              <div className="fme-summary-cell">
                <div className="fme-summary-label">Física</div>
                <div className="fme-summary-dot fme-summary-dot-warn"/>
                <div className="fme-summary-status">Atenção</div>
              </div>
            </div>
          </div>

          {/* Pastoral intervention */}
          <div className="fme-pastoral">
            <h3 className="fme-pastoral-q">Sugerir intervenção pastoral?</h3>
            <div className="fme-pastoral-opts">
              <button className="fme-pastoral-opt fme-pastoral-opt-on">Sim, agora</button>
              <button className="fme-pastoral-opt">Sim, em 30 dias</button>
              <button className="fme-pastoral-opt">Não</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="fma-hint" style={{ margin: '0 0 6px' }}>Quem fará?</div>
              <input className="fma-input" defaultValue="Daniel (OBT Lab) — visita de campo em junho"/>
            </div>
          </div>

          {/* CTAs */}
          <div className="fma-foot">
            <button className="fma-btn fma-btn-primary">
              <Icon.check width="16" height="16"/>
              Salvar avaliação · notificar Karina
            </button>
            <button className="fma-btn fma-btn-ghost">
              <Icon.download width="16" height="16"/>
              Baixar PDF da avaliação
            </button>
            <p className="fma-foot-note">A equipe receberá uma cópia por email. Histórico fica no projeto.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// CANVAS
// =================================================================
function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="field-forms"
        title="Formulários do Campo — Pulso Mensal"
        subtitle="Três variações para o líder da equipe (Fresia · Asháninka · YWAM Aurora). Mensal, no celular. Saídas: .json + WhatsApp.">
        <DCArtboard id="pulso" label="A · Pulso Mensal" width={420} height={1820}>
          <VariationA/>
        </DCArtboard>
        <DCArtboard id="multimodal" label="B · Conta o Mês — Multimodal" width={420} height={1820}>
          <VariationB/>
        </DCArtboard>
        <DCArtboard id="notify" label="D · Notificações — Coordenação" width={420} height={1820}>
          <VariationNotify/>
        </DCArtboard>
        <DCArtboard id="health" label="E · Saúde da Equipe — OBT Lab" width={460} height={2400}>
          <VariationE/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
