// Explorador de vocabulario + tarjetas de gramática (arquitectura, errores típicos, mini-ejercicio).
// Depende de app.js (tokens de color, t(), pinyinSyllables, cardText, displayUnitName, cardHsk, Icon, Lbl...).

// ---------- Tonos: color por carácter y contorno por sílaba ----------
function toneChars(zh, py) {
  const han = Array.from(zh || "").filter(c => /[一-鿿]/.test(c));
  const syls = [];
  (py || "").split(/([\p{L}]+)/u).forEach(part => {
    if (/\p{L}/u.test(part)) pinyinSyllables(part).forEach(s => syls.push(s));
  });
  if (!han.length || han.length !== syls.length) return null;
  return han.map((ch, i) => ({ ch, tone: syls[i].tone }));
}

function ToneHanzi({ zh, py, style }) {
  const tc = toneChars(zh, py);
  if (!tc) return <span style={style}>{zh}</span>;
  let k = 0;
  return (
    <span style={style}>
      {Array.from(zh).map((c, i) => {
        if (!/[一-鿿]/.test(c)) return <React.Fragment key={i}>{c}</React.Fragment>;
        const tone = tc[k++].tone;
        return <span key={i} style={{ color: TONE_COLORS_DARK[tone] }}>{c}</span>;
      })}
    </span>
  );
}

const TONE_PATHS = {
  1: "M3 4 L31 4",
  2: "M3 15 L31 4",
  3: "M3 5 C9 18 20 18 31 4",
  4: "M3 3 L31 15",
  0: "M13 10 L21 10",
};
function ToneContour({ tone, width = 34, height = 19 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 34 19" fill="none" aria-hidden="true">
      <path d={TONE_PATHS[tone] || TONE_PATHS[0]} stroke={TONE_COLORS_DARK[tone]} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// Datos de radicales e historias (hanzi-info.js) — se cargan al abrir el explorador, no al arrancar la app.
function useHanziInfo() {
  const [ready, setReady] = React.useState(!!window.HANZI_INFO);
  React.useEffect(() => {
    if (window.HANZI_INFO) return;
    const el = document.createElement("script");
    el.src = "hanzi-info.js";
    el.onload = () => setReady(true);
    document.head.appendChild(el);
  }, []);
  return ready ? window.HANZI_INFO : null;
}
const LANG_IDX = { es: 0, en: 1, fr: 2 };

// Radical, componentes e historia mnemotécnica de cada carácter de una palabra.
function CharAnatomy({ zh, py, lang, info }) {
  const tc = toneChars(zh, py);
  const chars = Array.from(new Set(Array.from(zh).filter(c => /[一-鿿]/.test(c)))).filter(c => info[c]);
  if (!chars.length) return null;
  const li = LANG_IDX[lang] ?? 0;
  const toneOfChar = (ch) => { const f = tc && tc.find(x => x.ch === ch); return f ? TONE_COLORS_DARK[f.tone] : "#fff"; };
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <p style={{ color: TEXT_3, fontSize: 12, margin: "0 0 8px" }}>{t("radicales_title", lang)}</p>
      {chars.map(ch => {
        const d = info[ch];
        return (
          <div key={ch} style={{ background: "rgba(255,255,255,0.05)", border: CARD_BORDER, borderRadius: 16, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: toneOfChar(ch), lineHeight: 1 }}>{ch}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: TEXT_3, fontSize: 11, marginBottom: 4 }}>{t("radical_label", lang)}: <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{d.r[0]}</span> <span style={{ color: TEXT_2 }}>{d.r[1 + li]}</span></div>
                {d.k.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                    {d.k.map((k, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span style={{ color: TEXT_3, fontSize: 12 }}>+</span>}
                        <span style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "3px 8px", fontSize: 12, color: TEXT_2 }}>
                          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{k[0]}</span> {k[1 + li]}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 10, color: TEXT_2, fontSize: 14, lineHeight: 1.5 }}>
              <span style={{ color: "#FFCA28", fontWeight: 700, fontSize: 12 }}>{t("historia_title", lang)} </span>{d.s[li]}
            </div>
          </div>
        );
      })}
      <p style={{ color: TEXT_3, fontSize: 11, margin: "4px 0 0", lineHeight: 1.4 }}>{t("mnemo_note", lang)}</p>
    </div>
  );
}

const STATUS_DOT = { mastered: "#66BB6A", learning: "#FFA726", new: "rgba(255,255,255,0.3)" };

function normSearch(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ---------- Hoja de detalle de una palabra ----------
function WordSheet({ card, topic, lang, speak, status, showPinyin, onClose, onPractice, onStudy }) {
  const tc = toneChars(card.zh, card.py);
  const hanziInfo = useHanziInfo();
  const canWrite = Array.from(card.zh).some(ch => STROKES_DATA && STROKES_DATA[ch]);
  const primaryBtn = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 20, border: "none",
    background: "#fff", color: "#12151C", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT_UI,
  };
  const ghostBtn = { ...primaryBtn, background: "rgba(255,255,255,0.08)", color: TEXT_2, fontWeight: 600 };
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="gwc-sheet-bg" style={{
      position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} className="gwc-sheet" style={{
        width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", boxSizing: "border-box",
        background: "#171B22", borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: CARD_BORDER, borderBottom: "none", padding: "14px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.5)", fontFamily: FONT_UI,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: TEXT_3, fontSize: 12 }}>
            <span style={{ color: TEXT_2, fontWeight: 700 }}>{hskShort(cardHsk(card))}</span> · {topic}
          </span>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "rgba(255,255,255,0.08)", border: "none", color: TEXT_2, width: 34, height: 34, borderRadius: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <ToneHanzi zh={card.zh} py={card.py} style={{ fontSize: card.zh.length > 3 ? 40 : 54, fontWeight: 700, lineHeight: 1.1 }} />
            <div style={{ fontSize: 20, marginTop: 8 }}>{renderPinyinTone(card.py, true)}</div>
            <div style={{ color: TEXT_2, fontSize: 17, marginTop: 6, lineHeight: 1.35 }}>{cardText(card, "es", lang)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <button onClick={() => speak(card.zh)} style={primaryBtn}><Icon name="volume" size={15} />{t("audio_normal", lang)}</button>
            <button onClick={() => speak(card.zh, 0.45)} style={ghostBtn}><Icon name="volume" size={15} />{t("audio_lento", lang)}</button>
          </div>
        </div>

        {tc && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: TEXT_3, fontSize: 12, margin: "0 0 8px" }}>{t("contorno_tonal", lang)}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tc.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: CARD_BORDER, borderRadius: 14, padding: "8px 12px" }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: TONE_COLORS_DARK[s.tone] }}>{s.ch}</span>
                  <ToneContour tone={s.tone} />
                  <span style={{ color: TEXT_3, fontSize: 11, fontWeight: 700 }}>{s.tone === 0 ? "·" : `T${s.tone}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hanziInfo && <CharAnatomy zh={card.zh} py={card.py} lang={lang} info={hanziInfo} />}

        {card.exZh && (
          <div style={{ marginTop: 18, background: "rgba(255,255,255,0.05)", border: CARD_BORDER, borderRadius: 16, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: TEXT_3, fontSize: 12 }}>{t("ejemplo_contexto", lang)}</span>
              <button onClick={() => speak(card.exZh)} style={{ background: "none", border: "none", color: "#FF8A80", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_UI }}>
                <Icon name="volume" size={14} />{t("escuchar_frase", lang)}
              </button>
            </div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{card.exZh}</div>
            {showPinyin && <div style={{ fontSize: 13, margin: "4px 0", fontStyle: "italic" }}>{renderPinyinTone(card.exPy, true)}</div>}
            <div style={{ color: TEXT_2, fontSize: 14 }}>{cardText(card, "exEs", lang)}</div>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, alignItems: "center" }}>
          {canWrite && <button onClick={() => onPractice(card)} style={ghostBtn}><Icon name="writing" size={15} />{t("practicar_trazo", lang)}</button>}
          <button onClick={() => onStudy(card)} style={ghostBtn}><Icon name="layers" size={15} />{t("estudiar_tarjeta", lang)}</button>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: TEXT_3, fontSize: 12 }}>
            <LevelDot color={STATUS_DOT[status]} />{t(status === "mastered" ? "status_dominada" : status === "learning" ? "status_aprendiendo" : "status_nueva", lang)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- Pantalla del explorador ----------
function ExploreScreen({ cards, lang, speak, statusOf, showPinyin, onPractice, onStudy }) {
  const [q, setQ] = React.useState("");
  const [topic, setTopic] = React.useState(null);
  const [openId, setOpenId] = React.useState(null);
  const [limit, setLimit] = React.useState(60);
  const topicOf = (c) => displayUnitName(c, lang).split("·").pop().trim();

  const topics = React.useMemo(() => {
    const m = new Map();
    cards.forEach(c => { const k = topicOf(c); m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries());
  }, [cards, lang]);

  const nq = normSearch(q.trim());
  const filtered = cards.filter(c => {
    if (topic && topicOf(c) !== topic) return false;
    if (!nq) return true;
    return c.zh.includes(q.trim()) || normSearch(c.py).includes(nq) || normSearch(c.py.replace(/\s/g, "")).includes(nq) ||
      normSearch(cardText(c, "es", lang)).includes(nq) || normSearch(c.es).includes(nq);
  });
  const shown = filtered.slice(0, limit);
  const open = openId != null ? cards.find(c => c.id === openId) : null;

  const chip = (active) => ({
    flexShrink: 0, minHeight: 34, padding: "6px 14px", borderRadius: 18, cursor: "pointer", fontFamily: FONT_UI, fontSize: 12,
    border: `1px solid ${active ? "#FF9D3D" : "rgba(255,255,255,0.14)"}`,
    background: active ? "rgba(255,157,61,0.16)" : "transparent", color: active ? "#FF9D3D" : TEXT_2, fontWeight: active ? 700 : 500,
  });

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 14, top: 13, color: TEXT_3 }}><Icon name="search" size={18} /></span>
        <input value={q} onChange={e => { setQ(e.target.value); setLimit(60); }} placeholder={t("buscar_placeholder", lang)}
          autoCapitalize="off" autoCorrect="off" spellCheck={false}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 42px", borderRadius: 16, border: CARD_BORDER, background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16, fontFamily: FONT_UI, outline: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 4, scrollbarWidth: "none" }}>
        <button onClick={() => { setTopic(null); setLimit(60); }} style={chip(topic === null)}>{t("filter_todas", lang)} · {cards.length}</button>
        {topics.map(([name, n]) => (
          <button key={name} onClick={() => { setTopic(name === topic ? null : name); setLimit(60); }} style={chip(topic === name)}>{name} · {n}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: TEXT_3, fontSize: 14, textAlign: "center", marginTop: 30 }}>{t("sin_resultados", lang)}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {shown.map(c => (
            <div key={c.id} role="button" tabIndex={0} onClick={() => setOpenId(c.id)}
              onKeyDown={e => { if (e.key === "Enter") setOpenId(c.id); }}
              style={{ position: "relative", background: "rgba(255,255,255,0.05)", border: CARD_BORDER, borderRadius: 16, padding: "12px 12px 10px", cursor: "pointer", minHeight: 96 }}>
              <span style={{ position: "absolute", top: 12, right: 12 }}><LevelDot color={STATUS_DOT[statusOf(c.id)]} /></span>
              <ToneHanzi zh={c.zh} py={c.py} style={{ fontSize: c.zh.length > 3 ? 20 : 26, fontWeight: 700, lineHeight: 1.15 }} />
              <div style={{ fontSize: 12, margin: "3px 0 4px" }}>{renderPinyinTone(c.py, true)}</div>
              <div style={{ color: TEXT_2, fontSize: 13, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cardText(c, "es", lang)}</div>
            </div>
          ))}
        </div>
      )}
      {filtered.length > shown.length && (
        <button onClick={() => setLimit(l => l + 60)} style={{ ...chip(false), display: "block", margin: "16px auto 0", padding: "10px 22px" }}>
          {t("mostrar_mas", lang)} ({filtered.length - shown.length})
        </button>
      )}

      {open && (
        <WordSheet card={open} topic={topicOf(open)} lang={lang} speak={speak} status={statusOf(open.id)} showPinyin={showPinyin}
          onClose={() => setOpenId(null)} onPractice={onPractice} onStudy={onStudy} />
      )}
    </div>
  );
}

// ---------- Gramática: arquitectura + mini-ejercicio ----------
const GRAMMAR_LABELS = new Set(["主语", "谓语", "宾语", "动词", "名词", "形容词", "副词", "量词", "时间词", "时间", "地点", "其他", "数量", "语法", "主"]);

function formulaParts(zh) {
  if (!zh || /[❌✅]/.test(zh)) return null;
  const parts = zh.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean);
  return parts.length >= 2 && parts.length <= 7 && parts.every(p => p.length <= 24) ? parts : null;
}
function fixedTokens(part) {
  return part.split("/").map(p => p.replace(/[（(].*?[）)]/g, "").trim())
    .filter(p => /^[一-鿿]{1,3}$/.test(p) && !GRAMMAR_LABELS.has(p));
}

let GRAMMAR_POOL = null;
function grammarPool() {
  if (GRAMMAR_POOL) return GRAMMAR_POOL;
  const set = new Set();
  ALL_CARDS.forEach(c => {
    if (!/📐/.test(c.unitName || "") || c.unit === 30) return;
    const parts = formulaParts(c.zh);
    if (parts) parts.forEach(p => fixedTokens(p).forEach(w => { if (w.length <= 2) set.add(w); }));
  });
  GRAMMAR_POOL = Array.from(set);
  return GRAMMAR_POOL;
}

function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCloze(card) {
  const ex = card.exZh || "";
  const parts = formulaParts(card.zh);
  if (!ex || !parts) return null;
  const tokens = parts.flatMap(fixedTokens).filter(w => ex.includes(w)).sort((a, b) => b.length - a.length);
  if (!tokens.length) return null;
  const answer = tokens[0];
  const distractors = seededShuffle(grammarPool().filter(w => w !== answer && !ex.includes(w) && Math.abs(w.length - answer.length) <= 1), card.id).slice(0, 3);
  if (distractors.length < 3) return null;
  return { prompt: ex.replace(answer, "＿＿"), answer, options: seededShuffle([answer, ...distractors], card.id + 7) };
}

function GrammarQuiz({ card, cat, lang, speak }) {
  const cloze = React.useMemo(() => buildCloze(card), [card.id]);
  const [picked, setPicked] = React.useState(null);
  if (!cloze) return null;
  const done = picked !== null;
  const ok = picked === cloze.answer;
  return (
    <div style={{ marginTop: 14, background: "rgba(255,255,255,0.04)", border: CARD_BORDER, borderRadius: 16, padding: 14 }}>
      <p style={{ color: TEXT_2, fontSize: 12, fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="target" size={15} />{t("ponlo_prueba", lang)}
      </p>
      <p style={{ color: TEXT_3, fontSize: 12, margin: "0 0 6px" }}>{t("quiz_prompt", lang)} · {cardText(card, "exEs", lang)}</p>
      <p style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 12px", letterSpacing: 1 }}>
        {done && ok ? card.exZh : cloze.prompt}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {cloze.options.map(o => {
          const isAns = o === cloze.answer;
          const isPick = o === picked;
          const color = done && isAns ? "#66BB6A" : isPick ? "#FF8A80" : null;
          return (
            <button key={o} disabled={done && ok} onClick={() => { if (done && ok) return; setPicked(o); haptic(o === cloze.answer ? 15 : [25, 35, 25]); if (o === cloze.answer) speak(card.exZh); }}
              style={{
                minHeight: 46, borderRadius: 12, fontSize: 20, fontWeight: 700, cursor: "pointer", fontFamily: FONT_UI,
                border: `1.5px solid ${color || "rgba(255,255,255,0.14)"}`,
                background: color ? `${color}22` : "rgba(255,255,255,0.05)", color: color || "#fff",
              }}>{o}</button>
          );
        })}
      </div>
      {done && (
        <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: ok ? "#66BB6A" : "#FF8A80", display: "flex", alignItems: "center", gap: 8 }}>
          {ok ? t("quiz_ok", lang) : t("quiz_no", lang)}
          {!ok && <button onClick={() => setPicked(null)} style={{ background: "none", border: "none", color: TEXT_2, textDecoration: "underline", cursor: "pointer", fontSize: 12, fontFamily: FONT_UI }}>{t("quiz_retry", lang)}</button>}
        </p>
      )}
    </div>
  );
}

function PatternCardView({ card, cat, lang, speak, showPinyin }) {
  const mistake = /[❌✅]/.test(card.zh);
  const parts = formulaParts(card.zh);
  const pyParts = parts && card.py ? card.py.split(/\s*\+\s*/) : [];
  const hasPy = parts && pyParts.length === parts.length;
  const speakText = card.zh.replace(/[❌✅]/g, "");
  const tip = (window.GRAMMAR_TIPS || {})[card.id];
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: CARD_BORDER, borderRadius: 20, padding: 16, marginBottom: 14, boxShadow: `inset 4px 0 0 ${cat.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
        <span style={{ color: cat.color === "#5E35B1" ? "#B39DDB" : cat.color, fontSize: 11, fontWeight: 700, background: `${cat.color}26`, borderRadius: 20, padding: "3px 10px" }}>
          {displayUnitName(card, lang)}
        </span>
        <SpeakButton text={speakText} speak={speak} speaking={false} color={cat.color} lang={lang} />
      </div>

      {mistake ? (
        <div style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.35)", borderRadius: 14, padding: "10px 12px" }}>
          <p style={{ color: "#FFCA28", fontSize: 12, fontWeight: 700, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="alert" size={15} />{t("error_tipico", lang)}
          </p>
          {card.zh.split(/(?=[❌✅])/).map((seg, i) => (
            <p key={i} style={{ margin: "2px 0", fontSize: 17, fontWeight: 700, color: seg.trim().startsWith("❌") ? "#FF8A80" : "#81C784" }}>{seg.trim()}</p>
          ))}
        </div>
      ) : (
        <>
          <h3 style={{ color: "#fff", fontSize: 19, margin: "0 0 2px", lineHeight: 1.3 }}>{card.zh}</h3>
          {showPinyin && !parts && <p style={{ fontSize: 13, fontStyle: "italic", margin: "0 0 6px" }}>{renderPinyinTone(card.py, true)}</p>}
        </>
      )}

      {parts && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: TEXT_3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 8px" }}>{t("arquitectura", lang).toUpperCase()}</p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            {parts.map((p, i) => {
              const fixed = fixedTokens(p).length > 0;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ color: TEXT_3, fontSize: 14 }}>+</span>}
                  <div style={{
                    borderRadius: 12, padding: "6px 12px", textAlign: "center",
                    background: fixed ? `${cat.color}33` : "rgba(255,255,255,0.07)",
                    border: `1px solid ${fixed ? cat.color + "99" : "rgba(255,255,255,0.12)"}`,
                  }}>
                    <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{p}</div>
                    {hasPy && showPinyin && <div style={{ color: TEXT_3, fontSize: 11 }}>{pyParts[i]}</div>}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ color: TEXT_2, fontSize: 14, lineHeight: 1.5, margin: "12px 0" }}>{cardText(card, "es", lang)}</p>

      {!mistake && tip && (
        <div style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.35)", borderRadius: 14, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: "#FFCA28", fontSize: 12, fontWeight: 700, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="alert" size={15} />{t("ojo_hispano", lang)}
          </p>
          <p style={{ color: TEXT_2, fontSize: 14, lineHeight: 1.5, margin: 0 }}>{tip[lang] || tip.es}</p>
          {tip.wrong && tip.right && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "#FF8A80", fontSize: 16, fontWeight: 700 }}>❌ {tip.wrong}</div>
              {showPinyin && tip.wrong_py && <div style={{ color: TEXT_3, fontSize: 11, fontStyle: "italic", marginBottom: 4 }}>{tip.wrong_py}</div>}
              <div style={{ color: "#81C784", fontSize: 16, fontWeight: 700 }}>✅ {tip.right}</div>
              {showPinyin && tip.right_py && <div style={{ color: TEXT_3, fontSize: 11, fontStyle: "italic" }}>{tip.right_py}</div>}
            </div>
          )}
        </div>
      )}

      {card.exZh && (
        <div style={{ background: `${cat.color}14`, borderRadius: 14, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>{card.exZh}</p>
            <SpeakButton text={card.exZh} speak={speak} speaking={false} color={cat.color} lang={lang} />
          </div>
          {showPinyin && <p style={{ fontSize: 12, margin: "3px 0", fontStyle: "italic" }}>{renderPinyinTone(card.exPy, true)}</p>}
          <p style={{ color: TEXT_2, fontSize: 13, margin: 0 }}>{cardText(card, "exEs", lang)}</p>
        </div>
      )}

      <GrammarQuiz card={card} cat={cat} lang={lang} speak={speak} />
    </div>
  );
}

// ---------- Gramática: lista por categoría/nivel + página de detalle ----------
const OTHER_CAT = { key: "otras", label: "Otras", color: "#78909C", ids: [] };
function catOfCard(c) {
  return PATTERN_CATEGORIES.find(cat => cat.ids.includes(c.id)) || OTHER_CAT;
}
function patternTitle(c) { return /[❌✅]/.test(c.zh) ? c.es : c.zh; }
function patternSub(c) {
  if (!/[❌✅]/.test(c.zh)) return c.es;
  const ok = c.zh.split(/(?=[❌✅])/).find(s => s.trim().startsWith("✅"));
  return ok ? ok.trim() : "";
}

function GrammarRow({ card, cat, lang, status, hasTip, onOpen }) {
  const title = patternTitle(card);
  const sub = lang === "es" || !card.en ? patternSub(card) : (/[❌✅]/.test(card.zh) ? patternSub(card) : cardText(card, "es", lang));
  return (
    <button onClick={() => onOpen(card)} style={{
      width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONT_UI,
      padding: "12px 14px 12px 16px", marginBottom: 8, borderRadius: 16, border: CARD_BORDER, color: "inherit",
      background: "rgba(255,255,255,0.05)", boxShadow: `inset 4px 0 0 ${cat.color}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</div>
        {sub && <div style={{ color: TEXT_2, fontSize: 13, lineHeight: 1.35, marginTop: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sub}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: TEXT_3, fontSize: 11 }}><LevelDot color={cat.color} />{categoryLabel(cat, lang)}</span>
          {hasTip && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#FFCA28", fontSize: 11, fontWeight: 700 }}><Icon name="alert" size={12} />{t("gram_tip_badge", lang)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        <span style={{ color: "#fff", background: HSK_COLORS[cardHsk(card)], borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{hskShort(cardHsk(card))}</span>
        <LevelDot color={STATUS_DOT[status]} />
      </div>
    </button>
  );
}

function GrammarListScreen({ cards, lang, statusOf, onOpen, onPractice }) {
  const [catKey, setCatKey] = React.useState(null);
  const [sort, setSort] = React.useState("level");
  const [q, setQ] = React.useState("");
  const tips = window.GRAMMAR_TIPS || {};

  const catCounts = new Map();
  cards.forEach(c => { const k = catOfCard(c).key; catCounts.set(k, (catCounts.get(k) || 0) + 1); });
  const cats = [...PATTERN_CATEGORIES, OTHER_CAT].filter(c => catCounts.get(c.key));

  const nq = normSearch(q.trim());
  const filtered = cards.filter(c => {
    if (catKey && catOfCard(c).key !== catKey) return false;
    if (!nq) return true;
    return c.zh.includes(q.trim()) || normSearch(c.es).includes(nq) || normSearch(cardText(c, "es", lang)).includes(nq) || normSearch(c.py).includes(nq);
  });

  const groups = [];
  if (sort === "level") {
    [1, 2, 3, 4, 5, 6, 7, 0].forEach(l => {
      const items = filtered.filter(c => cardHsk(c) === l);
      if (items.length) groups.push({ key: "l" + l, label: l === 0 ? t("hsk_out", lang) : hskShort(l), color: HSK_COLORS[l], items });
    });
  } else {
    const byUnit = new Map();
    filtered.forEach(c => { if (!byUnit.has(c.unit)) byUnit.set(c.unit, []); byUnit.get(c.unit).push(c); });
    Array.from(byUnit.entries()).sort((a, b) => a[0] - b[0]).forEach(([u, items]) => {
      groups.push({ key: "u" + u, label: displayUnitName(items[0], lang).replace("📐 ", ""), color: UNIT_COLORS[u] ? UNIT_COLORS[u].accent : "#78909C", items });
    });
  }

  const chip = (active, color) => ({
    flexShrink: 0, minHeight: 34, padding: "6px 14px", borderRadius: 18, cursor: "pointer", fontFamily: FONT_UI, fontSize: 12,
    display: "inline-flex", alignItems: "center", gap: 6,
    border: `1px solid ${active ? (color || "#FF9D3D") : "rgba(255,255,255,0.14)"}`,
    background: active ? `${color || "#FF9D3D"}26` : "transparent", color: active ? "#fff" : TEXT_2, fontWeight: active ? 700 : 500,
  });

  const ordered = groups.flatMap(g => g.items);
  return (
    <div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 14, top: 13, color: TEXT_3 }}><Icon name="search" size={18} /></span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("gram_buscar", lang)} autoCapitalize="off" autoCorrect="off" spellCheck={false}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 42px", borderRadius: 16, border: CARD_BORDER, background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16, fontFamily: FONT_UI, outline: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none" }}>
        <button onClick={() => setCatKey(null)} style={chip(catKey === null)}>{t("filter_todas", lang)} · {cards.length}</button>
        {cats.map(cat => (
          <button key={cat.key} onClick={() => setCatKey(catKey === cat.key ? null : cat.key)} style={chip(catKey === cat.key, cat.color)}>
            <LevelDot color={cat.color} />{categoryLabel(cat, lang)} · {catCounts.get(cat.key)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 0 12px", gap: 10 }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 3 }}>
          {[["level", "gram_sort_level"], ["unit", "gram_sort_unit"]].map(([k, key]) => (
            <button key={k} onClick={() => setSort(k)} style={{
              border: "none", cursor: "pointer", borderRadius: 9, padding: "6px 12px", fontSize: 12, fontFamily: FONT_UI, fontWeight: sort === k ? 700 : 500,
              background: sort === k ? "rgba(255,255,255,0.14)" : "transparent", color: sort === k ? "#fff" : TEXT_3,
            }}>{t(key, lang)}</button>
          ))}
        </div>
        <button onClick={() => onPractice(filtered)} disabled={!filtered.length} style={{
          border: "none", cursor: filtered.length ? "pointer" : "not-allowed", borderRadius: 14, padding: "9px 16px", fontSize: 13, fontWeight: 700, fontFamily: FONT_UI,
          background: filtered.length ? GRAD_PRIMARY : "#2a2f3a", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6,
        }}><Icon name="play" size={14} />{tn("gram_practicar", lang, filtered.length)}</button>
      </div>

      {groups.length === 0 && <p style={{ color: TEXT_3, fontSize: 13, textAlign: "center", lineHeight: 1.5, marginTop: 24 }}>{cards.length === 0 ? t("pattern_empty", lang) : t("sin_resultados", lang)}</p>}

      {groups.map(g => (
        <div key={g.key} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px 2px" }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: g.color }} />
            <span style={{ color: TEXT_2, fontSize: 13, fontWeight: 700 }}>{g.label}</span>
            <span style={{ color: TEXT_3, fontSize: 12 }}>· {g.items.length}</span>
          </div>
          {g.items.map(c => <GrammarRow key={c.id} card={c} cat={catOfCard(c)} lang={lang} status={statusOf(c.id)} hasTip={!!tips[c.id]} onOpen={(card) => onOpen(card, ordered)} />)}
        </div>
      ))}
    </div>
  );
}

function PatternDetailView({ card, index, total, lang, speak, showPinyin, onBack, onPrev, onNext }) {
  const cat = catOfCard(card);
  const nav = { flex: 1, minHeight: 50, borderRadius: 16, border: CARD_BORDER, background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: FONT_UI, cursor: "pointer" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onBack} style={{ color: TEXT_2, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontFamily: FONT_UI, padding: "6px 0" }}>{t("gram_back", lang)}</button>
        <span style={{ color: TEXT_3, fontSize: 13 }}>{index + 1} / {total}</span>
        <span style={{ color: "#fff", background: HSK_COLORS[cardHsk(card)], borderRadius: 10, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{hskShort(cardHsk(card))}</span>
      </div>
      <PatternCardView key={card.id} card={card} cat={cat} lang={lang} speak={speak} showPinyin={showPinyin} />
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={onPrev} disabled={index === 0} style={{ ...nav, opacity: index === 0 ? 0.4 : 1 }}>{t("anterior", lang)}</button>
        <button onClick={onNext} disabled={index >= total - 1} style={{ ...nav, opacity: index >= total - 1 ? 0.4 : 1, background: GRAD_PRIMARY, border: "none" }}>{t("siguiente", lang)}</button>
      </div>
    </div>
  );
}
