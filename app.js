const { useState, useEffect, useCallback, useRef } = React;

// ---------- Color por tono (pinyin) ----------
// Asocia cada tono del mandarín a un color fijo — técnica mnemónica estándar
// para memorizar tonos (verificados: 4.5:1+ de contraste en fondos claros
// y oscuros reales de la app; ver auditoría de diseño).
// Cada carácter con tilde de tono mapea a [letra base, número de tono], para
// poder reconstruir tanto el tono como la forma "plana" de la palabra.
const TONE_VOWELS = {
  "ā":["a",1],"ē":["e",1],"ī":["i",1],"ō":["o",1],"ū":["u",1],"ǖ":["ü",1],
  "Ā":["a",1],"Ē":["e",1],"Ī":["i",1],"Ō":["o",1],"Ū":["u",1],"Ǖ":["ü",1],
  "á":["a",2],"é":["e",2],"í":["i",2],"ó":["o",2],"ú":["u",2],"ǘ":["ü",2],
  "Á":["a",2],"É":["e",2],"Í":["i",2],"Ó":["o",2],"Ú":["u",2],"Ǘ":["ü",2],
  "ǎ":["a",3],"ě":["e",3],"ǐ":["i",3],"ǒ":["o",3],"ǔ":["u",3],"ǚ":["ü",3],
  "Ǎ":["a",3],"Ě":["e",3],"Ǐ":["i",3],"Ǒ":["o",3],"Ǔ":["u",3],"Ǚ":["ü",3],
  "à":["a",4],"è":["e",4],"ì":["i",4],"ò":["o",4],"ù":["u",4],"ǜ":["ü",4],
  "À":["a",4],"È":["e",4],"Ì":["i",4],"Ò":["o",4],"Ù":["u",4],"Ǜ":["ü",4],
};
const TONE_COLORS_LIGHT = { 1: "#B23A2E", 2: "#8A5A00", 3: "#256B29", 4: "#1257A6", 0: "#5F5F5F" };

// ---------- Textos de interfaz (ES/EN/FR) ----------
// Diccionario único para todo el texto fijo de la UI (botones, títulos,
// hints). Se va completando a medida que cada pantalla se vuelve
// traducible — t("clave", lang) devuelve el texto en el idioma activo,
// con español como respaldo si falta una clave.
const UI_STRINGS = {
  ver_pinyin: { es: "拼 Ver pinyin", en: "拼 View pinyin", fr: "拼 Voir le pinyin" },
  ver_traduccion: { es: "🇲🇽 Ver traducción", en: "🇺🇸 View translation", fr: "🇫🇷 Voir la traduction" },
  sin_audio: { es: "Esta tarjeta no tiene audio disponible", en: "This card has no audio available", fr: "Cette carte n'a pas d'audio disponible" },
  menu_back: { es: "← Menú", en: "← Menu", fr: "← Menu" },
  categorias_back: { es: "← Categorías", en: "← Categories", fr: "← Catégories" },
  unidades_suffix: { es: "unidades", en: "units", fr: "unités" },
  mastery_title_vocab: { es: "Palabras que domino", en: "Words I've mastered", fr: "Mots que je maîtrise" },
  mastery_title_chars: { es: "Caracteres que domino", en: "Characters I've mastered", fr: "Caractères que je maîtrise" },
  tab_palabras: { es: "🔤 Palabras", en: "🔤 Words", fr: "🔤 Mots" },
  tab_caracteres: { es: "🖌️ Caracteres", en: "🖌️ Characters", fr: "🖌️ Caractères" },
  filter_todas: { es: "Todas", en: "All", fr: "Toutes" },
  filter_dominadas: { es: "Dominadas", en: "Mastered", fr: "Maîtrisés" },
  filter_aprendiendo: { es: "Aprendiendo", en: "Learning", fr: "En cours" },
  filter_nuevas: { es: "Nuevas", en: "New", fr: "Nouveaux" },
  status_dominada: { es: "Dominada", en: "Mastered", fr: "Maîtrisé" },
  status_aprendiendo: { es: "Aprendiendo", en: "Learning", fr: "En cours" },
  status_nueva: { es: "Nueva", en: "New", fr: "Nouveau" },
  mastery_empty_select_vocab: { es: "Selecciona unidades en Opciones para ver su vocabulario aquí.", en: "Select units in Settings to see its vocabulary here.", fr: "Sélectionnez des unités dans Options pour voir son vocabulaire ici." },
  mastery_empty_select_chars: { es: "Selecciona unidades en Opciones para ver sus caracteres aquí.", en: "Select units in Settings to see its characters here.", fr: "Sélectionnez des unités dans Options pour voir ses caractères ici." },
  mastery_empty_filter: { es: "Nada en este filtro todavía.", en: "Nothing in this filter yet.", fr: "Rien dans ce filtre pour l'instant." },
  opciones_title: { es: "⚙️ Opciones", en: "⚙️ Settings", fr: "⚙️ Options" },
  idioma_title: { es: "Idioma", en: "Language", fr: "Langue" },
  direccion_title: { es: "Dirección de estudio", en: "Study direction", fr: "Sens d'étude" },
  dir_prompt_zh: { es: "🇲🇽 → 🇨🇳 Español a Chino", en: "🇬🇧 → 🇨🇳 English to Chinese", fr: "🇫🇷 → 🇨🇳 Français à chinois" },
  dir_zh_prompt: { es: "🇨🇳 → 🇲🇽 Chino a Español", en: "🇨🇳 → 🇬🇧 Chinese to English", fr: "🇨🇳 → 🇫🇷 Chinois à français" },
  dir_listen: { es: "🔊 Solo audio (producción)", en: "🔊 Audio only (production)", fr: "🔊 Audio seulement (production)" },
  dir_listen_hint: { es: '"Solo audio" te reta a recordar el pinyin y el significado antes de revelar — sin ver el carácter primero.', en: '"Audio only" challenges you to recall the pinyin and meaning before revealing — without seeing the character first.', fr: '« Audio seulement » vous met au défi de retrouver le pinyin et le sens avant de révéler — sans voir le caractère d\'abord.' },
  toggle_audio: { es: "🔊 Reproducir audio al revelar", en: "🔊 Play audio on reveal", fr: "🔊 Lire l'audio à la révélation" },
  prog_dominadas: { es: "Dominadas", en: "Mastered", fr: "Maîtrisés" },
  prog_aprendiendo: { es: "Aprendiendo", en: "Learning", fr: "En cours" },
  prog_nuevas: { es: "Nuevas", en: "New", fr: "Nouveaux" },
  prog_title_vocab: { es: "Tu vocabulario", en: "Your vocabulary", fr: "Votre vocabulaire" },
  prog_title_chars: { es: "Tus caracteres", en: "Your characters", fr: "Vos caractères" },
  prog_title_build: { es: "Frases que ya dominas", en: "Sentences you've mastered", fr: "Phrases que vous maîtrisez" },
  nivel_facil_desc: { es: "Fichas justas: solo ordénalas para formar la frase.", en: "Exact tiles: just put them in order to form the sentence.", fr: "Tuiles exactes : il suffit de les ordonner pour former la phrase." },
  nivel_medio_desc: { es: "Hay fichas de más: elige solo las correctas y ordénalas.", en: "Extra tiles mixed in: pick only the right ones and order them.", fr: "Des tuiles en trop : choisissez les bonnes et ordonnez-les." },
  nivel_hard_desc: { es: "Escribe la frase completa de memoria con teclado chino.", en: "Type the whole sentence from memory with a Chinese keyboard.", fr: "Écrivez toute la phrase de mémoire avec un clavier chinois." },
  toggle_haptics: { es: "📳 Vibración al responder", en: "📳 Vibrate on answer", fr: "📳 Vibration à la réponse" },
  toggle_pinyin: { es: "拼 Mostrar pinyin al revelar", en: "拼 Show pinyin on reveal", fr: "拼 Afficher le pinyin à la révélation" },
  limite_diario_title: { es: "Límite diario de repaso", en: "Daily review limit", fr: "Limite quotidienne de révision" },
  limite_diario_hint: { es: "Evita repasos interminables en un solo día", en: "Avoids endless reviews in a single day", fr: "Évite des révisions interminables en une seule journée" },
  sin_limite: { es: "Sin límite", en: "No limit", fr: "Sans limite" },
  seleccionar_unidades: { es: "Seleccionar unidades", en: "Select units", fr: "Sélectionner les unités" },
  todas: { es: "Todas", en: "All", fr: "Toutes" },
  ninguna: { es: "Ninguna", en: "None", fr: "Aucune" },
  libro1_unidades: { es: "📙 LIBRO 1 — Unidades", en: "📙 BOOK 1 — Units", fr: "📙 LIVRE 1 — Unités" },
  libro2: { es: "📗 LIBRO 2", en: "📗 BOOK 2", fr: "📗 LIVRE 2" },
  libro3: { es: "📘 LIBRO 3", en: "📘 BOOK 3", fr: "📘 LIVRE 3" },
  tarjetas_seleccionadas: { es: "tarjetas seleccionadas", en: "cards selected", fr: "cartes sélectionnées" },
  reiniciar_progreso: { es: "Reiniciar progreso guardado", en: "Reset saved progress", fr: "Réinitialiser la progression enregistrée" },
  reiniciar_progreso_confirm: {
    es: "¿Seguro que quieres borrar todo tu progreso guardado (tarjetas, caracteres y racha)? Esto no se puede deshacer.",
    en: "Are you sure you want to erase all your saved progress (cards, characters and streak)? This can't be undone.",
    fr: "Voulez-vous vraiment effacer toute votre progression enregistrée (cartes, caractères et série) ? Cette action est irréversible.",
  },
  dia_seguido: { es: "día seguido", en: "day streak", fr: "jour de suite" },
  dias_seguidos: { es: "días seguidos", en: "day streak", fr: "jours de suite" },
  bienvenido_title: { es: "👋 ¡Bienvenido!", en: "👋 Welcome!", fr: "👋 Bienvenue !" },
  bienvenido_hint: { es: "Estudia tu primera tarjeta para empezar a ver tu progreso aquí", en: "Study your first card to start seeing your progress here", fr: "Étudiez votre première carte pour commencer à voir vos progrès ici" },
  repaso_hoy_title: { es: "📅 Repaso de hoy", en: "📅 Today's review", fr: "📅 Révision du jour" },
  repaso_hoy_hint: { es: "El sistema elige qué se te va a olvidar pronto, de todas tus unidades", en: "The system picks what you're about to forget, across all your units", fr: "Le système choisit ce que vous allez bientôt oublier, dans toutes vos unités" },
  tarjetas_suffix: { es: "tarjetas", en: "cards", fr: "cartes" },
  nuevas_suffix: { es: "nuevas", en: "new", fr: "nouvelles" },
  repaso_suffix: { es: "repaso", en: "review", fr: "révision" },
  repasar_btn: { es: "Repasar →", en: "Review →", fr: "Réviser →" },
  repaso_completo: { es: "🎉 ¡Ya repasaste todo por hoy! Vuelve mañana.", en: "🎉 You've reviewed everything for today! Come back tomorrow.", fr: "🎉 Vous avez tout révisé pour aujourd'hui ! Revenez demain." },
  flashcards_btn: { es: "📚 Flashcards", en: "📚 Flashcards", fr: "📚 Cartes mémo" },
  cambiar_en_opciones: { es: "unidades seleccionadas · cambiar en Opciones", en: "units selected · change in Settings", fr: "unités sélectionnées · changer dans Options" },
  home_subtitle_welcome: { es: "Tú eliges el tema: repasa todas las tarjetas de tus unidades seleccionadas", en: "You choose the topic: review all the cards from your selected units", fr: "Vous choisissez le thème : révisez toutes les cartes de vos unités sélectionnées" },
  construir_frases: { es: "Construir frases", en: "Build sentences", fr: "Construire des phrases" },
  disponibles_suffix: { es: "disponibles", en: "available", fr: "disponibles" },
  patrones_gramaticales: { es: "Patrones gramaticales", en: "Grammar patterns", fr: "Structures grammaticales" },
  sesion_mixta: { es: "🔀 Sesión mixta · repaso + escritura intercalados", en: "🔀 Mixed session · review + writing interleaved", fr: "🔀 Session mixte · révision + écriture entrelacées" },
  dir_short_prompt_zh: { es: "ES→中", en: "EN→中", fr: "FR→中" },
  dir_short_zh_prompt: { es: "中→ES", en: "中→EN", fr: "中→FR" },
  tab_inicio: { es: "Inicio", en: "Home", fr: "Accueil" },
  tab_patrones: { es: "Patrones", en: "Patterns", fr: "Structures" },
  tab_construir: { es: "Construir", en: "Build", fr: "Construire" },
  tab_escritura: { es: "Escritura", en: "Writing", fr: "Écriture" },
  tab_vocabulario: { es: "Vocabulario", en: "Vocabulary", fr: "Vocabulaire" },
  construir_frases_title: { es: "✏️ Construir frases", en: "✏️ Build sentences", fr: "✏️ Construire des phrases" },
  construir_desc: { es: "Arma la frase en chino con las fichas, o escríbela de memoria en 听写. Elige el nivel:", en: "Build the sentence in Chinese with the tiles, or write it from memory in 听写 (dictation). Pick a level:", fr: "Construisez la phrase en chinois avec les tuiles, ou écrivez-la de mémoire en 听写 (dictée). Choisissez un niveau :" },
  nivel_facil: { es: "🟢 Fácil", en: "🟢 Easy", fr: "🟢 Facile" },
  nivel_medio: { es: "🟡 Medio", en: "🟡 Medium", fr: "🟡 Moyen" },
  comenzar: { es: "Comenzar", en: "Start", fr: "Commencer" },
  escritura_title: { es: "🖌️ Escritura", en: "🖌️ Writing", fr: "🖌️ Écriture" },
  escritura_desc: { es: "Practica el orden de trazos de los caracteres de tus unidades seleccionadas, uno por uno.", en: "Practice the stroke order of the characters from your selected units, one at a time.", fr: "Entraînez-vous à l'ordre des traits des caractères de vos unités sélectionnées, un par un." },
  repasar_pendientes_hoy: { es: "📅 Repasar pendientes de hoy", en: "📅 Review today's pending", fr: "📅 Réviser les éléments du jour" },
  caracteres_suffix: { es: "caracteres", en: "characters", fr: "caractères" },
  selecciona_unidades_chars: { es: "Selecciona unidades en Opciones para practicar sus caracteres.", en: "Select units in Settings to practice their characters.", fr: "Sélectionnez des unités dans Options pour pratiquer leurs caractères." },
  ver_que_caracteres_domino: { es: "📊 Ver qué caracteres domino", en: "📊 See which characters I've mastered", fr: "📊 Voir les caractères que je maîtrise" },
  vocab_title: { es: "🔤 Vocabulario", en: "🔤 Vocabulary", fr: "🔤 Vocabulaire" },
  vocab_desc: { es: "Estudia solo los términos de tus unidades seleccionadas — carácter, pinyin y significado, con una frase de ejemplo.", en: "Study just the terms from your selected units — character, pinyin and meaning, with an example sentence.", fr: "Étudiez seulement les termes de vos unités sélectionnées — caractère, pinyin et sens, avec une phrase d'exemple." },
  terminos_suffix: { es: "términos", en: "terms", fr: "termes" },
  vocab_empty: { es: "Todavía no hay vocabulario propio para las unidades seleccionadas. Prueba con unidades 13 a 27 en Opciones.", en: "There's no dedicated vocabulary for your selected units yet. Try units 13 to 27 in Settings.", fr: "Il n'y a pas encore de vocabulaire dédié pour vos unités sélectionnées. Essayez les unités 13 à 27 dans Options." },
  ver_que_palabras_domino: { es: "📊 Ver qué palabras domino", en: "📊 See which words I've mastered", fr: "📊 Voir les mots que je maîtrise" },
  patrones_title: { es: "📐 Patrones gramaticales", en: "📐 Grammar patterns", fr: "📐 Structures grammaticales" },
  patrones_desc: { es: "Las estructuras se repiten en varias unidades — están agrupadas por tipo y ordenadas por la unidad donde aparecen, dentro de tus unidades seleccionadas.", en: "These structures repeat across several units — they're grouped by type and ordered by the unit where they appear, within your selected units.", fr: "Ces structures se répètent dans plusieurs unités — elles sont groupées par type et classées par l'unité où elles apparaissent, parmi vos unités sélectionnées." },
  patrones_suffix: { es: "patrones", en: "patterns", fr: "structures" },
  pattern_empty: { es: "Todavía no has seleccionado ninguna unidad con este patrón — elegí más unidades en Opciones para verlo aquí.", en: "You haven't selected a unit with this pattern yet — pick more units in Settings to see it here.", fr: "Vous n'avez pas encore sélectionné d'unité avec cette structure — choisissez plus d'unités dans Options pour la voir ici." },
  practicar_patrones: { es: "🎯 Practicar estos patrones", en: "🎯 Practice these patterns", fr: "🎯 Pratiquer ces structures" },
  ronda_completada: { es: "¡Ronda completada!", en: "Round complete!", fr: "Manche terminée !" },
  tarjetas_estudiadas: { es: "tarjetas estudiadas", en: "cards studied", fr: "cartes étudiées" },
  stat_las_se: { es: "✅ Las sé", en: "✅ I know them", fr: "✅ Je les connais" },
  stat_casi: { es: "🤔 Casi", en: "🤔 Almost", fr: "🤔 Presque" },
  stat_repasar: { es: "❌ Repasar", en: "❌ To review", fr: "❌ À revoir" },
  seguir_repaso_hoy: { es: "📅 Seguir con el repaso de hoy", en: "📅 Continue today's review", fr: "📅 Continuer la révision du jour" },
  pendientes_suffix: { es: "pendientes", en: "pending", fr: "en attente" },
  repasar_fallidas: { es: "🔄 Repasar las que me fallaron", en: "🔄 Review the ones I missed", fr: "🔄 Réviser celles que j'ai ratées" },
  construir_con_unidades: { es: "✏️ Construir frases con estas unidades", en: "✏️ Build sentences with these units", fr: "✏️ Construire des phrases avec ces unités" },
  nueva_ronda: { es: "🔀 Nueva ronda completa", en: "🔀 New full round", fr: "🔀 Nouvelle manche complète" },
  menu_principal: { es: "← Menú principal", en: "← Main menu", fr: "← Menu principal" },
  ronda_frases_completada: { es: "¡Ronda de frases completada!", en: "Sentence round complete!", fr: "Manche de phrases terminée !" },
  frases_construidas: { es: "frases construidas", en: "sentences built", fr: "phrases construites" },
  a_la_primera: { es: "✅ A la primera", en: "✅ First try", fr: "✅ Du premier coup" },
  con_errores: { es: "❌ Con errores", en: "❌ With mistakes", fr: "❌ Avec des erreurs" },
  otra_ronda: { es: "🔀 Otra ronda", en: "🔀 Another round", fr: "🔀 Une autre manche" },
  repasar_flashcards: { es: "📚 Repasar como flashcards", en: "📚 Review as flashcards", fr: "📚 Réviser comme des cartes mémo" },
  tienes_pendientes_hoy: { es: "📅 Tienes {n} pendientes de repaso hoy", en: "📅 You have {n} pending for review today", fr: "📅 Vous avez {n} en attente de révision aujourd'hui" },
  completo: { es: "✅ ¡Completo!", en: "✅ Complete!", fr: "✅ Terminé !" },
  reiniciar: { es: "🔄 Reiniciar", en: "🔄 Reset", fr: "🔄 Réinitialiser" },
  pista: { es: "💡 Pista", en: "💡 Hint", fr: "💡 Indice" },
  pinyin_toggle: { es: "拼 Pinyin", en: "拼 Pinyin", fr: "拼 Pinyin" },
  terminar: { es: "Terminar", en: "Finish", fr: "Terminer" },
  siguiente: { es: "Siguiente →", en: "Next →", fr: "Suivant →" },
  toca_revelar: { es: "Toca para revelar", en: "Tap to reveal", fr: "Touchez pour révéler" },
  escuchar_de_nuevo: { es: "Escuchar de nuevo", en: "Listen again", fr: "Écouter à nouveau" },
  no_la_se: { es: "❌ No la sé", en: "❌ I don't know it", fr: "❌ Je ne sais pas" },
  casi: { es: "🤔 Casi", en: "🤔 Almost", fr: "🤔 Presque" },
  la_se: { es: "✅ La sé", en: "✅ I know it", fr: "✅ Je le sais" },
  sesion_mixta_badge: { es: "🔀 Sesión mixta", en: "🔀 Mixed session", fr: "🔀 Session mixte" },
  mixed_hint: { es: "Al calificar, si esta tarjeta tiene un carácter practicable pasarás a escribirlo antes de seguir", en: "After rating, if this card has a practicable character you'll write it before continuing", fr: "Après la notation, si cette carte a un caractère pratiquable, vous l'écrirez avant de continuer" },
  swipe_hint: { es: "↔ Desliza la tarjeta o usa los botones", en: "↔ Swipe the card or use the buttons", fr: "↔ Faites glisser la carte ou utilisez les boutons" },
  ver_explicacion: { es: "Ver explicación", en: "View explanation", fr: "Voir l'explication" },
  revelar: { es: "Revelar", en: "Reveal", fr: "Révéler" },
  toca_revelar_referencia: { es: "Toca para ver la explicación", en: "Tap to view the explanation", fr: "Touchez pour voir l'explication" },
  ficha_referencia: { es: "📖 Ficha de referencia", en: "📖 Reference card", fr: "📖 Fiche de référence" },
  listen_hint: { es: "Recuerda el pinyin y el significado antes de revelar", en: "Recall the pinyin and meaning before revealing", fr: "Rappelez-vous le pinyin et le sens avant de révéler" },
  ver_ejemplo: { es: "▼ Ver ejemplo", en: "▼ View example", fr: "▼ Voir l'exemple" },
  ocultar_ejemplo: { es: "▲ Ocultar ejemplo", en: "▲ Hide example", fr: "▲ Masquer l'exemple" },
  escuchar: { es: "Escuchar", en: "Listen", fr: "Écouter" },
  reproduciendo: { es: "Reproduciendo...", en: "Playing...", fr: "Lecture en cours..." },
  dominado: { es: "dominado", en: "mastered", fr: "maîtrisé" },
  speech_error: {
    es: "⚠️ No se pudo reproducir el audio. Revisá que tu teléfono tenga instalada la voz de chino (Ajustes → Accesibilidad/Idiomas → Texto a voz).",
    en: "⚠️ Couldn't play the audio. Check that your phone has the Chinese voice installed (Settings → Accessibility/Languages → Text-to-speech).",
    fr: "⚠️ Impossible de lire l'audio. Vérifiez que votre téléphone a la voix chinoise installée (Réglages → Accessibilité/Langues → Synthèse vocale).",
  },
  escribe_frase: { es: "ESCRIBE ESTA FRASE EN CHINO", en: "WRITE THIS SENTENCE IN CHINESE", fr: "ÉCRIVEZ CETTE PHRASE EN CHINOIS" },
  arma_frase: { es: "ARMA ESTA FRASE EN CHINO", en: "BUILD THIS SENTENCE IN CHINESE", fr: "CONSTRUISEZ CETTE PHRASE EN CHINOIS" },
  dictado_placeholder: { es: "打字…（使用中文键盘）", en: "Type… (use a Chinese keyboard)", fr: "Tapez… (utilisez un clavier chinois)" },
  correcto: { es: "✅ ¡Correcto!", en: "✅ Correct!", fr: "✅ Correct !" },
  no_coincide: { es: "❌ No coincide. Así se compara, carácter por carácter:", en: "❌ Doesn't match. Here's the character-by-character comparison:", fr: "❌ Ne correspond pas. Voici la comparaison caractère par caractère :" },
  verificar: { es: "Verificar", en: "Check", fr: "Vérifier" },
  toca_fichas_orden: { es: "Toca las fichas de abajo en orden", en: "Tap the tiles below in order", fr: "Touchez les tuiles ci-dessous dans l'ordre" },
  revisa_ficha_de_mas: { es: "❌ Revisa — puede que haya una ficha de más en tu respuesta", en: "❌ Check again — your answer might have an extra tile", fr: "❌ Vérifiez — votre réponse a peut-être une tuile en trop" },
  casi_revisa_orden: { es: "❌ Casi — revisa el orden y ajusta las fichas", en: "❌ Almost — check the order and adjust the tiles", fr: "❌ Presque — vérifiez l'ordre et ajustez les tuiles" },
  anterior: { es: "← Anterior", en: "← Previous", fr: "← Précédent" },
  ver_respuesta: { es: "🙈 Ver respuesta", en: "🙈 View answer", fr: "🙈 Voir la réponse" },
};
function t(key, lang) {
  const entry = UI_STRINGS[key];
  if (!entry) return key; // clave sin traducir todavía — mejor mostrar la clave que romper el render
  return entry[lang] || entry.es;
}
// Como t(), pero sustituye "{n}" por un valor — para frases cuyo orden de
// palabras cambia según el idioma y no se pueden armar concatenando partes.
function tn(key, lang, n) {
  return t(key, lang).replace("{n}", n);
}

// Traducciones de los labels de PATTERN_CATEGORIES (definida más abajo), por
// separado del array mismo para no tocar su forma — validate-data.js la
// extrae con una regex que espera exactamente esa estructura.
const PATTERN_CATEGORY_LABELS = {
  medidas: { en: "Measurements and quantities", fr: "Mesures et quantités" },
  posesion: { en: "的 and possession", fr: "的 et possession" },
  tiempo: { en: "Time", fr: "Temps" },
  poder: { en: "Ability and permission", fr: "Capacité et permission" },
  ubicacion: { en: "Location and direction", fr: "Lieu et direction" },
  preguntas: { en: "Special questions", fr: "Questions spéciales" },
  matices: { en: "Easily confused words", fr: "Mots faciles à confondre" },
  estructura: { en: "Sentence structure", fr: "Structure de la phrase" },
  tonos: { en: "Tones and radicals", fr: "Tons et radicaux" },
  clasificadores: { en: "量词 · Measure words", fr: "量词 · Classificateurs" },
};
function categoryLabel(cat, lang) {
  if (lang === "es" || !lang) return cat.label;
  return (PATTERN_CATEGORY_LABELS[cat.key] && PATTERN_CATEGORY_LABELS[cat.key][lang]) || cat.label;
}
const TONE_COLORS_DARK  = { 1: "#FF8A80", 2: "#FFB74D", 3: "#81C784", 4: "#82C4FF", 0: "#BDBDBD" };

// Iniciales y finales válidas del pinyin, para partir una palabra pegada
// (ej. "wǒmen") en sus sílabas reales — de lo contrario toda la palabra se
// pinta de un solo color según la primera tilde que aparezca.
const PINYIN_INITIALS = ["zh","ch","sh","b","p","m","f","d","t","n","l","g","k","h","j","q","x","r","z","c","s","y","w"];
const PINYIN_FINALS = [...new Set([
  "iang","iong","uang","ueng",
  "ang","eng","ong","ai","ei","ao","ou","an","en","er",
  "ia","ie","iu","iao","ian","in","ing",
  "ua","uo","ui","uai","uan","un",
  "ue","üe","üan","ün",
  "a","o","e","i","u","ü",
])].sort((a, b) => b.length - a.length);

// Divide una palabra pinyin (con tildes) en sus sílabas reales con su tono,
// usando coincidencia de máxima longitud contra iniciales/finales válidas.
function pinyinSyllables(word) {
  let flat = "";
  const toneAt = {};
  for (const ch of word) {
    const mapped = TONE_VOWELS[ch];
    if (mapped) { toneAt[flat.length] = mapped[1]; flat += mapped[0]; }
    else flat += ch.toLowerCase();
  }
  const bounds = [];
  let i = 0;
  while (i < flat.length) {
    const initial = PINYIN_INITIALS.find(ini => flat.startsWith(ini, i)) || "";
    const afterInitial = i + initial.length;
    const final = PINYIN_FINALS.find(fin => flat.startsWith(fin, afterInitial));
    const end = final ? afterInitial + final.length : i + 1; // sin final válida: no se traba, avanza 1
    bounds.push([i, end]);
    i = end;
  }
  return bounds.map(([start, end]) => {
    let tone = 0;
    for (let k = start; k < end; k++) if (toneAt[k]) tone = toneAt[k];
    return { text: word.slice(start, end), tone };
  });
}

// Colorea cada sílaba pinyin según su tono; deja espacios/puntuación sin colorear.
function renderPinyinTone(text, dark) {
  if (!text) return null;
  const palette = dark ? TONE_COLORS_DARK : TONE_COLORS_LIGHT;
  const parts = text.split(/([\p{L}]+)/u);
  return parts.map((part, i) => {
    if (!part) return null;
    if (!/\p{L}/u.test(part)) return part;
    return (
      <React.Fragment key={i}>
        {pinyinSyllables(part).map((syl, j) => (
          <span key={j} style={{ color: palette[syl.tone] }}>{syl.text}</span>
        ))}
      </React.Fragment>
    );
  });
}

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [speechError, setSpeechError] = useState(false);
  const voiceRef = useRef(null);
  const watchdogRef = useRef(null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      const zh = voices.find(v => v.lang.startsWith("zh")) ||
                 voices.find(v => v.lang.includes("CN")) ||
                 voices.find(v => v.lang.includes("TW"));
      voiceRef.current = zh || null;
      setVoiceReady(true);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const speak = useCallback((text) => {
    if (!text) return;
    setSpeechError(false);
    window.speechSynthesis.cancel();
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    // Chrome en Android puede "tragarse" speak() en silencio si se llama en el
    // mismo tick que cancel() — un respiro corto evita que la cola quede en un
    // estado inconsistente (bug conocido, no específico de esta app).
    setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "zh-CN";
      utt.rate = 0.85;
      utt.pitch = 1;
      if (voiceRef.current) utt.voice = voiceRef.current;
      let handled = false;
      utt.onstart = () => { handled = true; setSpeaking(true); };
      utt.onend = () => { handled = true; setSpeaking(false); };
      utt.onerror = () => { handled = true; setSpeaking(false); setSpeechError(true); };
      // Guarda una referencia viva del utterance: en Chrome/Android el motor puede
      // recolectarlo por GC antes de reproducirlo y descartar el speak() sin avisar
      // si no queda ninguna referencia fuerte al objeto.
      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
      // Si ni onstart ni onend ni onerror disparan, el motor ignoró la orden en
      // silencio — típicamente porque el dispositivo no tiene instalada una voz
      // de chino. Sin esto, el botón "Escuchar" simplemente no hace nada y no
      // hay forma de saber por qué.
      watchdogRef.current = setTimeout(() => {
        if (!handled) setSpeechError(true);
      }, 3000);
    }, 60);
  }, []);

  return { speak, speaking, voiceReady, speechError };
}


function FrontPinyinReveal({ pinyin, cardId, showPinyin, lang }) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [cardId]);
  if (!showPinyin) return null;
  return !shown ? (
    <button onClick={e => { e.stopPropagation(); setShown(true); }} style={{
      background: "rgba(255,255,255,0.07)", border: "1px dashed rgba(255,157,61,0.5)",
      borderRadius: 20, padding: "7px 18px", color: "#FF9D3D",
      fontSize: 13, cursor: "pointer"
    }}>
      {t("ver_pinyin", lang)}
    </button>
  ) : (
    <div style={{ fontSize: 16, fontStyle: "italic", color: TONE_COLORS_DARK[0] }}>{renderPinyinTone(pinyin, true)}</div>
  );
}

function ExampleBox({ card, color, speak, speaking, showPinyin, lang }) {
  const [showPy, setShowPy] = useState(false);
  const [showEs, setShowEs] = useState(false);
  return (
    <div onClick={e => e.stopPropagation()} style={{
      marginTop: 10, background: `${color.accent}12`, borderRadius: 14,
      padding: "12px 14px", width: "100%", boxSizing: "border-box"
    }}>
      {/* Chinese + audio */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 15, color: color.accent, fontWeight: "bold", textAlign: "center", lineHeight: 1.5 }}>
          {card.exZh}
        </span>
        <SpeakButton text={card.exZh} speak={speak} speaking={speaking} color={color.accent}
          style={{ background: speaking ? `${color.accent}33` : "transparent" }} lang={lang} />
      </div>

      {/* Pinyin reveal */}
      {showPinyin && (!showPy ? (
        <RevealButton onClick={() => setShowPy(true)} color={color.accent}>{t("ver_pinyin", lang)}</RevealButton>
      ) : (
        <p style={{ fontSize: 13, textAlign: "center", margin: "0 0 6px 0", fontStyle: "italic", color: TONE_COLORS_LIGHT[0] }}>
          {renderPinyinTone(card.exPy, false)}
        </p>
      ))}

      {/* Translation reveal */}
      {!showEs ? (
        <RevealButton onClick={() => setShowEs(true)} color={color.accent}>{t("ver_traduccion", lang)}</RevealButton>
      ) : (
        <p style={{ fontSize: 13, color: "#444", textAlign: "center", margin: "0", lineHeight: 1.5 }}>
          {cardText(card, "exEs", lang)}
        </p>
      )}
    </div>
  );
}


const RATING = { know: "know", almost: "almost", dontKnow: "dontKnow" };

// ---------- Repetición espaciada + progreso guardado ----------
// STORAGE_KEY guarda el progreso de las tarjetas (flashcards/vocabulario/construir);
// CHAR_STORAGE_KEY guarda el progreso de los CARACTERES en modo Escritura por separado,
// porque un carácter no siempre corresponde 1:1 a una tarjeta. Ambos usan el mismo
// esquema de "cajas" de Leitner, por eso comparten computeNextEntry/isDue.
const STORAGE_KEY = "gwc_srs_progress_v1";
const CHAR_STORAGE_KEY = "gwc_char_progress_v1";
const BOX_INTERVAL_DAYS = [1, 2, 4, 7, 14, 30]; // índice = número de caja
const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
const DAY_MS = 24 * 60 * 60 * 1000;

function loadProgress(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveProgress(progress, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (e) {
    // localStorage lleno o deshabilitado — falla en silencio, no rompe la app
  }
}

function computeNextEntry(prevEntry, rating) {
  const prevBox = prevEntry ? prevEntry.box : -1;
  let box;
  if (rating === RATING.know) box = Math.min(prevBox + 1, MAX_BOX);
  else if (rating === RATING.almost) box = Math.max(prevBox, 0);
  else box = 0;
  const days = BOX_INTERVAL_DAYS[box];
  return { box, nextReview: Date.now() + days * DAY_MS, lastReviewed: Date.now() };
}

function isDue(cardId, progress) {
  const p = progress[cardId];
  if (!p) return true; // nunca estudiada = pendiente
  return p.nextReview <= Date.now();
}

// Mezcla Fisher-Yates — a diferencia de array.sort(() => Math.random() - 0.5),
// da una permutación realmente uniforme. El truco del sort es sesgado (sobre
// todo en arrays chicos) y deja las tarjetas demasiado cerca de su orden
// original, que es por unidad — por eso el estudio se sentía "siempre igual".
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------- Preferencias guardadas (unidades, dirección, audio, pinyin, nivel) ----------
const PREFS_KEY = "gwc_prefs_v1";
const DEFAULT_PREFS = {
  selectedUnits: [1,2,3,4,5,6,7,8,9,10,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],
  studyDir: "es→zh", // identificador interno, no se traduce — "es→zh" sigue significando "idioma de la UI → chino"
  showPinyin: true,
  autoPlay: true,
  haptics: true,
  builderLevel: "easy",
  dailyCap: 0, // 0 = sin límite de tarjetas de repaso por día
  lang: "es", // "es" | "en" | "fr" — idioma de la interfaz y del significado/ejemplo de las tarjetas
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch (e) {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) { /* falla en silencio */ }
}

// ---------- Racha de días seguidos ----------
const STREAK_KEY = "gwc_streak_v1";

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { lastDate: null, current: 0, longest: 0 };
  } catch (e) {
    return { lastDate: null, current: 0, longest: 0 };
  }
}

function recordActivity(streak, setStreak) {
  const today = todayStr();
  if (streak.lastDate === today) return; // ya contado hoy
  const yesterday = new Date(Date.now() - DAY_MS);
  const yStr = yesterday.getFullYear() + "-" + (yesterday.getMonth() + 1) + "-" + yesterday.getDate();
  const newCurrent = streak.lastDate === yStr ? streak.current + 1 : 1;
  const updated = { lastDate: today, current: newCurrent, longest: Math.max(newCurrent, streak.longest) };
  localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  setStreak(updated);
}

// Una tarjeta es "de patrón" (gramática de referencia) si su unidad lleva la marca 📐.
// Único punto de esta comprobación — evita repetir el mismo string-check en cada lugar
// que necesita distinguir tarjetas de patrón de tarjetas normales.
function isPatternCard(card) {
  return !!(card && card.unitName && card.unitName.includes("📐"));
}

// ---------- Modo: Construir frases ----------
function isGoodForBuilder(card) {
  const zh = card.zh;
  if (isPatternCard(card)) return false;
  if (card.kind === "vocab") return false;
  if (/[\/（(]/.test(zh)) return false;
  if (/[A-Za-z]/.test(zh)) return false;
  if (zh.includes("……") || zh.includes("___")) return false;
  return true;
}

// Algunas fichas de referencia mezclan pinyin/español entre paréntesis en el
// campo zh (ej. "个(gè) — palabra medida universal") — eso no se debe leer en
// voz alta con una voz china. Esto detecta si el texto es chino "limpio".
function isSpeakableZh(text) {
  if (!text) return false;
  return !/[（(a-zA-Z]/.test(text.replace(/[❌✅]/g, ""));
}

// ---------- Idioma de interfaz/contenido ----------
// Las 1209 tarjetas guardan su significado en es/exEs (español, el idioma
// original del proyecto) y opcionalmente en/exEn y fr/exFr. cardText() es el
// único punto que decide qué campo mostrar, con español como respaldo si una
// tarjeta todavía no tiene su traducción a en/fr cargada.
const FIELD_LANG_MAP = {
  es: { en: "en", fr: "fr" },
  exEs: { en: "exEn", fr: "exFr" },
};
function cardText(card, field, lang) {
  if (!card) return "";
  if (lang === "es" || !lang) return card[field] ?? "";
  const targetField = FIELD_LANG_MAP[field] && FIELD_LANG_MAP[field][lang];
  if (!targetField) return card[field] ?? ""; // campo sin variante por idioma (ej. zh, py)
  return card[targetField] ?? card[field] ?? ""; // si falta la traducción, cae a español
}

// Los nombres de unidad (25 unidades reales + 8 categorías genéricas de la
// unidad 30) son los únicos textos "de contenido" que se repiten entre
// muchas tarjetas, así que se traducen una sola vez acá en vez de guardar
// unitName por idioma en cada una de las 1209 tarjetas.
const UNIT_TOPICS = {
  1: { en: "Greetings", fr: "Salutations" },
  2: { en: "Name", fr: "Nom" },
  3: { en: "Origin", fr: "Origine" },
  4: { en: "Work", fr: "Travail" },
  5: { en: "Age", fr: "Âge" },
  6: { en: "Description", fr: "Description" },
  7: { en: "Locations", fr: "Lieux" },
  8: { en: "Family", fr: "Famille" },
  9: { en: "Schedules", fr: "Horaires" },
  10: { en: "Introductions", fr: "Présentations" },
  13: { en: "Birthday", fr: "Anniversaire" },
  14: { en: "Where are you?", fr: "Où es-tu ?" },
  15: { en: "My bag is red", fr: "Mon sac est rouge" },
  16: { en: "How do you get there?", fr: "Comment y aller ?" },
  17: { en: "Shopping", fr: "Faire les courses" },
  18: { en: "Ordering food", fr: "Commander à manger" },
  19: { en: "Phone call", fr: "Appel téléphonique" },
  20: { en: "My room", fr: "Ma chambre" },
  21: { en: "Transportation", fr: "Transport" },
  22: { en: "Asking for help", fr: "Demander de l'aide" },
  23: { en: "Weather", fr: "Météo" },
  24: { en: "Ongoing action", fr: "Action en cours" },
  25: { en: "Habits and tastes", fr: "Habitudes et saveurs" },
  26: { en: "Housing and neighborhood", fr: "Logement et quartier" },
  27: { en: "Mail and packages", fr: "Courrier et colis" },
  28: { en: "Exchange rates and banking", fr: "Taux de change et banque" },
  29: { en: "Shopping for clothes", fr: "Achats de vêtements" },
};
const UNIT30_TOPICS = {
  "Clasificadores": { en: "Classifiers", fr: "Classificateurs" },
  "Estructura": { en: "Structure", fr: "Structure" },
  "Matices": { en: "Nuances", fr: "Nuances" },
  "Medidas": { en: "Measurements", fr: "Mesures" },
  "Preguntas": { en: "Questions", fr: "Questions" },
  "Tiempo": { en: "Time", fr: "Temps" },
  "Ubicación": { en: "Location", fr: "Lieu" },
  "的": { en: "的", fr: "的" },
};
// Reconstruye el unitName visible en el idioma activo. En español se usa el
// campo guardado tal cual (es la fuente de verdad, incluida la marca 📐 que
// isPatternCard() sigue leyendo de ahí sin importar el idioma mostrado).
function displayUnitName(card, lang) {
  if (!card) return "";
  if (lang === "es" || !lang) return card.unitName;
  const pattern = isPatternCard(card) ? "📐 " : "";
  if (card.unit === 30) {
    const key = card.unitName.replace(/^📐 Patrón · /, "").trim();
    const topic = (UNIT30_TOPICS[key] && UNIT30_TOPICS[key][lang]) || key;
    return `📐 ${lang === "fr" ? "Motif" : "Pattern"} · ${topic}`;
  }
  const b = bookInfo(card.unit);
  if (!b) return card.unitName;
  const prefix = b.book === 1 ? "" : "📗 ";
  const topic = (UNIT_TOPICS[card.unit] && UNIT_TOPICS[card.unit][lang]) || "";
  return `${prefix}L${b.book} · ${pattern}${topic}`;
}

// ---------- Libros ----------
// El contenido viene de 3 libros de texto distintos, cada uno con su propia
// numeración de unidades dentro de la app: Libro 1 = unidades 1-10 (sin offset),
// Libro 2 = unidades 13-22 (unidad visible = unidad - 12), Libro 3 = unidades
// 23+ (unidad visible = unidad - 22). La unidad 30 es una pseudo-unidad de
// referencia cruzada y no pertenece a ningún libro. Punto único de esta lógica:
// antes estaba duplicada (y desactualizada para el Libro 3) en varios lugares.
function bookInfo(unit) {
  if (unit >= 1 && unit <= 10) return { book: 1, num: unit };
  if (unit >= 13 && unit <= 22) return { book: 2, num: unit - 12 };
  if (unit >= 23 && unit !== 30) return { book: 3, num: unit - 22 };
  return null; // unidad 30 (referencia) u otro caso fuera de los 3 libros
}

const SCREEN_BG = "radial-gradient(120% 60% at 50% -10%, #212734 0%, #12151C 55%, #0C0E13 100%)";
const FONT_UI = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";

// Tokens de color: texto secundario/terciario cálidos con contraste AA sobre el fondo oscuro,
// y degradados de acción con contraste suficiente para texto blanco.
const TEXT_2 = "#CBD2DE";
const TEXT_3 = "#8F99AB";
const CARD_BORDER = "1px solid rgba(255,255,255,0.08)";
const GRAD_PRIMARY = "linear-gradient(135deg, #D84315, #EF6C00)";
const GRAD_BUILD = "linear-gradient(135deg, #00796B, #0097A7)";

// Íconos de línea (estilo Lucide) — se tiñen con currentColor y se ven igual en todas las plataformas.
const ICON_PATHS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  patterns: '<path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  build: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6a2 2 0 0 1-.9.5l-2.9.8a.5.5 0 0 1-.6-.6l.8-2.9a2 2 0 0 1 .5-.9z"/>',
  writing: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  vocab: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  chart: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  volume: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
};
function Icon({ name, size = 22, stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }} />
  );
}

// Quita el emoji inicial de un texto traducido (los íconos SVG lo reemplazan en botones y títulos).
const noEmoji = (str) => (str || "").replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\u2190-\u21FF]+\s*/u, "");

// Ícono + texto alineados en una fila.
function Lbl({ icon, size = 18, gap = 8, children, style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap, textAlign: "center", ...style }}>
      {icon && <span style={{ display: "inline-flex", flexShrink: 0 }}><Icon name={icon} size={size} /></span>}
      {icon ? <span>{children}</span> : children}
    </span>
  );
}

// Punto de color para niveles (reemplaza 🟢🟡🔴).
function LevelDot({ color }) {
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}
const LEVEL_COLORS = { easy: "#66BB6A", medium: "#FFCA28", hard: "#EF5350" };

// Vibración corta como respuesta táctil (solo Android/Chrome; iOS Safari no la soporta).
let HAPTICS_ON = true;
function haptic(pattern) {
  if (!HAPTICS_ON || typeof navigator === "undefined" || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

// ---------- Modo: Patrones gramaticales ----------
// Organiza las 📐 tarjetas de gramática por TIPO de patrón, cruzando unidades.
// Si se agregan más tarjetas 📐 en el futuro, hay que sumar sus IDs aquí.
const PATTERN_CATEGORIES = [
  { key: "medidas", icon: "📏", label: "Medidas y cantidades", color: "#FF6B35", ids: [40,41,250,251,181,182,183,254,162,163,314,315,316,317,318,319,320,321,322,323,324,325,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353] },
  { key: "posesion", icon: "🔑", label: "的 y posesión", color: "#7B1FA2", ids: [157,158,247,248,252,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373] },
  { key: "tiempo", icon: "⏰", label: "Tiempo", color: "#00695C", ids: [42,125,126,127,180,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,584,629,1184] },
  { key: "poder", icon: "🚦", label: "Poder y permiso", color: "#1565C0", ids: [124,164,253,286,394,395,396,397,398,400,401,402,403,404,405,406,407,408,583,600,628,656] },
  { key: "ubicacion", icon: "🧭", label: "Ubicación y dirección", color: "#2E7D32", ids: [173,174,175,223,224,225,226,269,270,271,272,222,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,457,1183] },
  { key: "preguntas", icon: "❓", label: "Preguntas especiales", color: "#C62828", ids: [170,171,172,176,268,273,166,458,459,460,461,462,463,464,465,466,467,468,469,470,471,472,473,474,475,476,477,478,479,480,481,482,483,484,485,613,655,1254] },
  { key: "matices", icon: "🔀", label: "Palabras que se confunden", color: "#AD1457", ids: [184,185,227,228,229,249,285,255,486,487,488,490,492,493,494,495,496,497,498,499,500,501,502,503,505,506,507,508,509,510,511,512,513,514,515,516,517,599,612,627] },
  { key: "estructura", icon: "✍️", label: "Estructura de oración", color: "#558B2F", ids: [165,169,298,299,312,313,518,519,520,521,522,523,524,525,526,527,528,529,530,531,532,533,534,535,536,537,538,539,540,541,601,615,641,642,643,1171,1172,1253,1267,1268] },
  { key: "tonos", icon: "🔤", label: "Tonos y radicales", color: "#5E35B1", ids: [159,160,161,130,167,168,177,178,179,230,256,257] },
  { key: "clasificadores", icon: "🔢", label: "量词 · Measure words", color: "#F9A825", ids: [542,543,544,545,546,547,548,549,550,551,552,554,555,556,557,558,559,560,561,562,563,564,565,566,567] },
];

function ProgressRing({ pct, size = 84, color = "#FF9D3D", lang }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{
        position: "absolute", top: 0, left: 0, width: size, height: size,
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column"
      }}>
        <span style={{ color: "white", fontSize: 20, fontWeight: "bold", fontFamily: FONT_UI }}>{pct}%</span>
        <span style={{ color: TEXT_3, fontSize: 9, fontFamily: FONT_UI }}>{t("dominado", lang)}</span>
      </div>
    </div>
  );
}

// ---------- Navegación principal (tabbar fijo) ----------
// Opciones queda fuera del tabbar a propósito: 5 destinos es el límite que
// recomiendan Material Design / Apple HIG para una barra inferior, y Ajustes
// es una pantalla de uso poco frecuente — encaja mejor como ícono de engranaje
// en el header (ver SettingsGearButton), accesible igual en 1 toque desde
// cualquier pantalla principal.
const TABS = [
  { key: "menu", icon: "home", labelKey: "tab_inicio" },
  { key: "patterns", icon: "patterns", labelKey: "tab_patrones" },
  { key: "buildHub", icon: "build", labelKey: "tab_construir" },
  { key: "writingHub", icon: "writing", labelKey: "tab_escritura" },
  { key: "vocabHub", icon: "vocab", labelKey: "tab_vocabulario" },
];

function SettingsGearButton({ setMode, style }) {
  return (
    <button onClick={() => setMode("settings")} style={{
      background: "rgba(255,255,255,0.07)", border: "none", color: TEXT_2, borderRadius: 12,
      cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", ...style
    }} aria-label="Opciones"><Icon name="settings" size={22} /></button>
  );
}

// ---------- Escritura de trazos ----------
const HAN_REGEX = /[一-鿿]/g;
function uniqueCharsForUnits(units) {
  const seen = new Set();
  const chars = [];
  ALL_CARDS.filter(c => units.includes(c.unit)).forEach(c => {
    const matches = (c.zh || "").match(HAN_REGEX);
    if (!matches) return;
    matches.forEach(ch => {
      if (!seen.has(ch) && STROKES_DATA && STROKES_DATA[ch]) {
        seen.add(ch);
        chars.push(ch);
      }
    });
  });
  return chars;
}

function TabBar({ activeMode, setMode, lang }) {
  return (
    <>
      <style>{`.gwc-tab:active { transform: scale(0.9); }`}</style>
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        background: "rgba(12,14,19,0.94)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: 6, paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
      }}>
        {TABS.map(tab => {
          const active = activeMode === tab.key;
          return (
            <button key={tab.key} className="gwc-tab" onClick={() => setMode(tab.key)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              padding: "2px 2px", minWidth: 62, color: active ? "#FFB45C" : TEXT_3,
              fontSize: 11, fontFamily: FONT_UI, fontWeight: active ? 700 : 600,
              transition: "color 0.15s ease, transform 0.1s ease"
            }}>
              <span style={{
                width: 56, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center",
                background: active ? "rgba(255,157,61,0.18)" : "transparent", transition: "background 0.2s ease"
              }}>
                <Icon name={tab.icon} size={22} stroke={active ? 2.3 : 2} />
              </span>
              {t(tab.labelKey, lang)}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------- Componentes compartidos entre modos ----------

// Resumen de progreso (dominadas / aprendiendo / nuevas) para las pantallas hub.
function ProgressSummary({ title, counts, lang }) {
  const total = counts.mastered + counts.learning + counts.new;
  const pct = total ? Math.round((counts.mastered / total) * 100) : 0;
  const seg = (n, c) => n > 0 && <div style={{ width: `${(n / total) * 100}%`, background: c, transition: "width .5s ease" }} />;
  const legend = [
    { k: "prog_dominadas", n: counts.mastered, c: "#66BB6A" },
    { k: "prog_aprendiendo", n: counts.learning, c: "#FFA726" },
    { k: "prog_nuevas", n: counts.new, c: "rgba(255,255,255,0.35)" },
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: CARD_BORDER, borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ color: TEXT_2, fontSize: 13, fontWeight: 600 }}>{title}</span>
        <span style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ display: "flex", gap: 2, height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
        {total > 0 && <>{seg(counts.mastered, "#66BB6A")}{seg(counts.learning, "#FFA726")}</>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        {legend.map(l => (
          <div key={l.k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_2 }}>
            <LevelDot color={l.c} />
            <span style={{ fontWeight: 700, color: "#fff" }}>{l.n}</span>
            <span style={{ color: TEXT_3 }}>{t(l.k, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Botón de audio 🔊 — envuelve el chequeo isSpeakableZh + la llamada a speak().
// variant: "icon" (pastilla chica, dentro de tarjetas/listas), "label" (pastilla
// grande con texto "Escuchar"/"Reproduciendo...", color de la unidad) o "front"
// (versión de la portada de la flashcard, con paleta naranja fija).
function SpeakButton({ text, speak, speaking, color = "#aaa", variant = "icon", label, error = false, style, lang }) {
  if (!isSpeakableZh(text)) return null;
  const resolvedLabel = label || t("escuchar", lang);
  const onClick = (e) => { if (e) e.stopPropagation(); speak(text); };
  const errorHint = error && (
    <p style={{ color: "#F44336", fontSize: 11, textAlign: "center", margin: "4px 0 0 0", maxWidth: 280, lineHeight: 1.4 }}>
      {t("speech_error", lang)}
    </p>
  );
  if (variant === "label") {
    return (
      <>
        <button onClick={onClick} style={{
          background: speaking ? `${color}33` : `${color}15`, border: `1px solid ${color}66`,
          borderRadius: 30, padding: "7px 18px", color, fontSize: 14, cursor: "pointer",
          marginBottom: 10, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
          ...style
        }}>
          <Lbl icon="volume" size={16} gap={6}>{speaking ? t("reproduciendo", lang) : resolvedLabel}</Lbl>
        </button>
        {errorHint}
      </>
    );
  }
  if (variant === "front") {
    return (
      <>
        <button onClick={onClick} style={{
          background: speaking ? "rgba(255,107,53,0.3)" : "rgba(255,255,255,0.1)",
          border: `1px solid ${speaking ? "#FF6B35" : "rgba(255,255,255,0.2)"}`,
          borderRadius: 30, padding: "8px 18px", color: speaking ? "#FF9D3D" : "#aaa",
          fontSize: 15, cursor: "pointer", marginBottom: 12, transition: "all 0.2s",
          display: "flex", alignItems: "center", gap: 6,
          ...style
        }}>
          <Lbl icon="volume" size={17} gap={6}>{speaking ? t("reproduciendo", lang) : resolvedLabel}</Lbl>
        </button>
        {errorHint}
      </>
    );
  }
  return (
    <>
      <button onClick={onClick} style={{
        background: "none", border: `1px solid ${color}66`, borderRadius: 20,
        padding: "3px 8px", color, fontSize: 12, cursor: "pointer", flexShrink: 0,
        ...style
      }}><Icon name="volume" size={15} /></button>
      {errorHint}
    </>
  );
}

// Botón "revelar" con borde punteado — usado para pinyin/traducción ocultos por defecto.
function RevealButton({ onClick, children, color = "#FF9D3D" }) {
  return (
    <button onClick={onClick} style={{
      display: "block", width: "100%", background: `${color}10`,
      border: `1px dashed ${color}55`, borderRadius: 10, padding: "6px 0",
      color, fontSize: 12, cursor: "pointer"
    }}>
      {children}
    </button>
  );
}

// Envoltorio de las pantallas "hub" de cada modo (Construir/Escritura/Vocabulario):
// título centrado + descripción opcional + contenido propio + tabbar.
function HubScreen({ title, titleColor, icon, description, mode, setMode, lang, children }) {
  return (
    <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", paddingBottom: "calc(20px + 76px + env(safe-area-inset-bottom, 0px))", fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <span style={{ flex: 1 }} />
          <span style={{ color: titleColor, fontSize: 16, fontWeight: "bold", textAlign: "center" }}><Lbl icon={icon} size={19}>{noEmoji(title)}</Lbl></span>
          <span style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <SettingsGearButton setMode={setMode} />
          </span>
        </div>
        {description && (
          <p style={{ color: TEXT_2, fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
        {children}
      </div>
      <TabBar activeMode={mode} setMode={setMode} lang={lang} />
    </div>
  );
}

// Pantalla de resultados al terminar una ronda (Flashcards/Vocabulario/Construir):
// emoji + título + subtítulo + grilla de stats + lista de botones de acción.
function ResultsScreen({ icon = "trophy", title, titleColor, subtitle, stats, actions }) {
  return (
    <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", color: titleColor, background: "rgba(255,255,255,0.06)", border: `1px solid ${titleColor}55`, boxShadow: `0 0 40px ${titleColor}33` }}><Icon name={icon} size={40} stroke={1.8} /></div>
        <h2 style={{ color: titleColor, fontSize: 24, marginBottom: 4 }}>{title}</h2>
        <p style={{ color: TEXT_2, marginBottom: 32, fontSize: 14 }}>{subtitle}</p>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12, marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", border: CARD_BORDER, borderRadius: 16, padding: "16px 8px" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: TEXT_2, marginTop: 4 }}>{noEmoji(s.label)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {actions.filter(Boolean).map((a, i) => (
            <button key={i} onClick={a.onClick} disabled={a.disabled} style={{
              minHeight: 50, padding: "14px 0", borderRadius: 16, border: a.border || "none",
              background: a.disabled ? "#2a2f3a" : (a.background || "transparent"),
              color: a.disabled ? "#6b7385" : (a.color || TEXT_3),
              fontSize: a.fontSize || 14, fontWeight: a.bold ? "bold" : "normal",
              cursor: a.disabled ? "not-allowed" : "pointer"
            }}>
              <Lbl icon={a.icon} size={17}>{noEmoji(a.label)}</Lbl>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const initialPrefs = loadPrefs();
  const [selectedUnits, setSelectedUnits] = useState(initialPrefs.selectedUnits);
  const [mode, setMode] = useState("menu");
  const [masteryKind, setMasteryKind] = useState("vocab"); // "vocab" | "chars" — qué lista muestra la pantalla "Dominio"
  const [masteryFilter, setMasteryFilter] = useState("all"); // "all" | "mastered" | "learning" | "new"
  const [deck, setDeck] = useState([]);
  const [lastDeckKind, setLastDeckKind] = useState("study");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showPinyin, setShowPinyin] = useState(initialPrefs.showPinyin);
  const [showExample, setShowExample] = useState(false);
  const [ratings, setRatings] = useState({});
  const [studyDir, setStudyDir] = useState(initialPrefs.studyDir);
  const [lang, setLang] = useState(initialPrefs.lang);
  const [animating, setAnimating] = useState(false);
  // Deslizar para calificar la tarjeta volteada: derecha = "la sé", izquierda =
  // "no la sé" — además de los botones, que siguen siendo el respaldo accesible.
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartXRef = useRef(null);
  const [autoPlay, setAutoPlay] = useState(initialPrefs.autoPlay);
  const [haptics, setHaptics] = useState(initialPrefs.haptics);
  HAPTICS_ON = haptics;
  const [progress, setProgress] = useState(() => loadProgress());
  const [charProgress, setCharProgress] = useState(() => loadProgress(CHAR_STORAGE_KEY));
  const [streak, setStreak] = useState(() => loadStreak());
  const [dailyCap, setDailyCap] = useState(initialPrefs.dailyCap);
  const { speak, speaking, voiceReady, speechError } = useSpeech();

  const units = [...new Set(ALL_CARDS.map(c => c.unit))].sort((a,b)=>a-b);

  const allDueCards = ALL_CARDS.filter(c => isDue(c.id, progress));
  // Tope diario opcional: evita sobrecargar al usuario con repasos infinitos en un solo día
  const dueCards = dailyCap > 0 ? allDueCards.slice(0, dailyCap) : allDueCards;
  const dueCount = dueCards.length;
  const newDueCount = dueCards.filter(c => !progress[c.id]).length;
  const reviewDueCount = dueCount - newDueCount;
  const masteredCount = Object.values(progress).filter(p => p.box >= MAX_BOX).length;
  const learningCount = Object.values(progress).filter(p => p.box < MAX_BOX).length;
  const newCount = ALL_CARDS.length - Object.keys(progress).length;
  const masteredPct = Math.round((masteredCount / ALL_CARDS.length) * 100);
  const hasHistory = Object.keys(progress).length > 0;

  const masteryFor = (cards) => {
    if (cards.length === 0) return 0;
    const mastered = cards.filter(c => progress[c.id] && progress[c.id].box >= MAX_BOX).length;
    return Math.round((mastered / cards.length) * 100);
  };
  const unitMastery = (unitNum) => masteryFor(ALL_CARDS.filter(c => c.unit === unitNum));
  // Mismo criterio que masteryFor (caja máxima = dominada), pero para un solo
  // id contra cualquiera de los dos mapas de progreso (tarjetas o caracteres).
  const statusFor = (id, progressMap) => {
    const p = progressMap[id];
    if (!p) return "new";
    return p.box >= MAX_BOX ? "mastered" : "learning";
  };
  // Caracteres que ya "desbloquean" tus unidades seleccionadas — se usa para
  // decidir qué tarjetas de la unidad 30 (el cajón genérico de drills de
  // sustitución, sin una unidad de origen propia) tiene sentido mostrar: son
  // variantes de práctica que reutilizan vocabulario de varias unidades reales,
  // así que en vez de mostrarlas siempre (lo que hacía que filtrar por unidad
  // pareciera no hacer nada, porque son el 70% de las tarjetas de Patrones),
  // solo se muestran si TODO su vocabulario ya está cubierto por lo seleccionado.
  const knownChars = new Set();
  ALL_CARDS.filter(c => selectedUnits.includes(c.unit)).forEach(c => {
    const m = (c.zh || "").match(HAN_REGEX);
    if (m) m.forEach(ch => knownChars.add(ch));
  });
  const isUnlockedDrill = (card) => {
    const chars = (card.zh || "").match(/[一-鿿]/g) || [];
    return chars.every(ch => knownChars.has(ch));
  };

  // Tarjetas de una categoría de Patrones, respetando las unidades seleccionadas
  // en Opciones (igual que Flashcards/Construir/Vocabulario/Escritura) y
  // ordenadas por unidad para reflejar el orden en que se van viendo en el curso.
  const categoryCards = (cat) => ALL_CARDS
    .filter(c => cat.ids.includes(c.id) && (c.unit === 30 ? isUnlockedDrill(c) : selectedUnits.includes(c.unit)))
    .sort((a, b) => a.unit - b.unit);
  const categoryMastery = (cat) => masteryFor(categoryCards(cat));

  const resetProgress = () => {
    if (window.confirm(t("reiniciar_progreso_confirm", lang))) {
      setProgress({});
      saveProgress({});
      setCharProgress({});
      saveProgress({}, CHAR_STORAGE_KEY);
      const clearedStreak = { lastDate: null, current: 0, longest: 0 };
      setStreak(clearedStreak);
      localStorage.setItem(STREAK_KEY, JSON.stringify(clearedStreak));
    }
  };

  // ---------- Modo: Patrones gramaticales ----------
  const [selectedCategory, setSelectedCategory] = useState(null);

  const openCategory = (cat) => {
    setSelectedCategory(cat);
    setMode("patternDetail");
  };

  const practiceCategory = (cat) => {
    const shuffled = shuffle(categoryCards(cat));
    setDeck(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setShowExample(false);
    setRatings({});
    setMode("study");
  };

  const startReviewToday = () => {
    const shuffled = shuffle(dueCards);
    setDeck(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setShowExample(false);
    setRatings({});
    setMode("study");
  };

  // ---------- Modo: Sesión mixta (intercalada) ----------
  // Alterna, tarjeta por tarjeta, entre repaso de flashcard y práctica de
  // escritura del carácter — la intercalación de tipos de práctica ayuda a
  // consolidar mejor la memoria que repetir siempre la misma actividad.
  const [mixedQueue, setMixedQueue] = useState([]);
  const [mixedIdx, setMixedIdx] = useState(0);
  const [mixedFlipped, setMixedFlipped] = useState(false);
  const [mixedFromWrite, setMixedFromWrite] = useState(false); // true mientras "writing" está anidado dentro de una sesión mixta

  // ---------- Modo: Construir frases ----------
  const [builderLevel, setBuilderLevel] = useState(initialPrefs.builderLevel); // easy | medium | hard

  // Guarda preferencias automáticamente cuando cambian (va aquí porque necesita builderLevel ya declarado)
  useEffect(() => {
    savePrefs({ selectedUnits, studyDir, showPinyin, autoPlay, haptics, builderLevel, dailyCap, lang });
  }, [selectedUnits, studyDir, showPinyin, autoPlay, haptics, builderLevel, dailyCap, lang]);

  // Transición suave al cambiar de pantalla (solo el contenido; la barra inferior fija no se mueve).
  useEffect(() => {
    const rootEl = document.getElementById("root");
    const el = rootEl && rootEl.firstElementChild && rootEl.firstElementChild.firstElementChild;
    if (!el || !el.animate || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    el.animate(
      [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
      { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }, [mode]);
  const [buildDeck, setBuildDeck] = useState([]);
  const [buildIdx, setBuildIdx] = useState(0);
  const [pool, setPool] = useState([]);
  const [answer, setAnswer] = useState([]);
  const [buildResult, setBuildResult] = useState(null);
  const [buildStats, setBuildStats] = useState({ correct: 0, wrong: 0 });
  const [showBuildAnswer, setShowBuildAnswer] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [hardResult, setHardResult] = useState(null);
  const [hardDiff, setHardDiff] = useState([]);

  const buildableCards = ALL_CARDS.filter(c => selectedUnits.includes(c.unit) && isGoodForBuilder(c));
  const buildCard = buildDeck[buildIdx];

  const getDistractorChars = (correctChars, count) => {
    const pool2 = new Set();
    buildableCards.forEach(c => Array.from(c.zh).forEach(ch => {
      if (!/[，。！？、；：""''\?\!]/.test(ch)) pool2.add(ch);
    }));
    correctChars.forEach(ch => pool2.delete(ch));
    const arr = [...pool2];
    const picked = [];
    for (let i = 0; i < count && arr.length > 0; i++) {
      const idx = Math.floor(Math.random() * arr.length);
      picked.push(arr.splice(idx, 1)[0]);
    }
    return picked;
  };

  const shuffleTilesFor = (c) => {
    const correctChars = Array.from(c.zh);
    let tiles = correctChars.map((ch, i) => ({ ch, uid: c.id + "-" + i + "-" + Math.random() }));
    if (builderLevel === "medium") {
      const distractors = getDistractorChars(correctChars, 3);
      tiles = tiles.concat(distractors.map((ch, i) => ({ ch, uid: c.id + "-d" + i + "-" + Math.random() })));
    }
    setPool(shuffle(tiles));
    setAnswer([]);
    setBuildResult(null);
    setShowBuildAnswer(false);
    setTypedAnswer("");
    setHardResult(null);
    setHardDiff([]);
  };

  const startBuild = () => {
    const shuffled = shuffle(buildableCards);
    setBuildDeck(shuffled);
    setBuildIdx(0);
    setBuildStats({ correct: 0, wrong: 0 });
    shuffleTilesFor(shuffled[0]);
    setMode("build");
  };

  // ---------- Modo: Escritura de trazos ----------
  const [writeDeck, setWriteDeck] = useState([]);
  const [writeIdx, setWriteIdx] = useState(0);
  const [writeComplete, setWriteComplete] = useState(false);
  const [writeStats, setWriteStats] = useState({ done: 0 });
  const [writeShowPinyin, setWriteShowPinyin] = useState(false);
  const writeTargetRef = useRef(null);
  const writeWriterRef = useRef(null);

  const writableChars = uniqueCharsForUnits(selectedUnits);
  const writeDueChars = writableChars.filter(ch => isDue(ch, charProgress));
  const writeChar = writeDeck[writeIdx];

  const startWriting = (dueOnly = false) => {
    const source = dueOnly ? writeDueChars : writableChars;
    const shuffled = shuffle(source);
    setWriteDeck(shuffled);
    setWriteIdx(0);
    setWriteComplete(false);
    setWriteStats({ done: 0 });
    setMode("writing");
  };

  const nextWriteChar = () => {
    if (writeIdx + 1 >= writeDeck.length) {
      if (mixedFromWrite) {
        setMixedFromWrite(false);
        advanceMixed();
      } else {
        setMode("menu");
      }
    } else {
      setWriteIdx(i => i + 1);
      setWriteComplete(false);
    }
  };

  // Crea/recrea el trazador cada vez que cambia el carácter actual
  useEffect(() => {
    if (mode !== "writing" || !writeChar || !writeTargetRef.current) return;
    writeTargetRef.current.innerHTML = "";
    const writer = HanziWriter.create(writeTargetRef.current, writeChar, {
      width: 260, height: 260, padding: 16,
      showOutline: true,
      strokeColor: "#241209",
      outlineColor: "#e5d9c9",
      drawingColor: "#C6501F",
      charDataLoader: (ch, onComplete) => onComplete(STROKES_DATA[ch]),
    });
    writeWriterRef.current = writer;
    writer.quiz({
      showHintAfterMisses: 2,
      onComplete: () => {
        setWriteComplete(true);
        setWriteStats(prev => ({ done: prev.done + 1 }));
        recordActivity(streak, setStreak);
        setCharProgress(prev => {
          const updated = { ...prev, [writeChar]: computeNextEntry(prev[writeChar], RATING.know) };
          saveProgress(updated, CHAR_STORAGE_KEY);
          return updated;
        });
      },
    });
    return () => { writeWriterRef.current = null; };
  }, [mode, writeChar]);

  const tapPoolTile = (tile) => {
    setPool(prev => prev.filter(t => t.uid !== tile.uid));
    setAnswer(prev => [...prev, tile]);
  };

  const tapAnswerTile = (tile) => {
    setAnswer(prev => prev.filter(t => t.uid !== tile.uid));
    setPool(prev => [...prev, tile]);
    setBuildResult(null);
  };

  const nextBuildCard = () => {
    if (buildIdx + 1 >= buildDeck.length) {
      setMode("buildResults");
    } else {
      const next = buildIdx + 1;
      setBuildIdx(next);
      shuffleTilesFor(buildDeck[next]);
    }
  };

  const prevBuildCard = () => {
    if (buildIdx === 0) return;
    const prev = buildIdx - 1;
    setBuildIdx(prev);
    shuffleTilesFor(buildDeck[prev]);
  };

  const registerResult = (correct) => {
    setBuildStats(prev => ({ ...prev, correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1) }));
    recordActivity(streak, setStreak);
    // Construir una frase correctamente también cuenta como repaso exitoso de esa
    // tarjeta: alimenta el mismo sistema de cajas que usan Flashcards/Vocabulario,
    // en vez de que el progreso de Construir se pierda al salir del modo.
    setProgress(prev => {
      const updated = { ...prev, [buildCard.id]: computeNextEntry(prev[buildCard.id], correct ? RATING.know : RATING.dontKnow) };
      saveProgress(updated);
      return updated;
    });
    if (correct) speak(buildCard.zh);
  };

  // Nivel medio: verificación manual (puede quedar fichas señuelo sin usar)
  const checkMediumAnswer = () => {
    const built = answer.map(t => t.ch).join("");
    const correct = built === buildCard.zh;
    haptic(correct ? 15 : [25, 35, 25]);
    setBuildResult(correct ? "correct" : "wrong");
    registerResult(correct);
  };

  // Nivel difícil (听写 tīngxiě): escribir la frase completa de memoria
  const checkHardAnswer = () => {
    const typed = typedAnswer.trim();
    const target = buildCard.zh;
    const correct = typed === target;
    const targetChars = Array.from(target);
    const typedChars = Array.from(typed);
    setHardDiff(targetChars.map((ch, i) => ({ ch, ok: typedChars[i] === ch })));
    setHardResult(correct ? "correct" : "wrong");
    registerResult(correct);
  };

  // Autocalifica en nivel fácil cuando ya se colocaron todas las fichas (no hay señuelos)
  useEffect(() => {
    if (mode === "build" && builderLevel === "easy" && buildCard && pool.length === 0 && answer.length > 0 && buildResult === null) {
      const built = answer.map(t => t.ch).join("");
      const correct = built === buildCard.zh;
      haptic(correct ? 15 : [25, 35, 25]);
      setBuildResult(correct ? "correct" : "wrong");
      registerResult(correct);
    }
  }, [pool.length, mode]);

  const startStudy = () => {
    const filtered = ALL_CARDS.filter(c => selectedUnits.includes(c.unit));
    const shuffled = shuffle(filtered);
    setDeck(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setShowExample(false);
    setRatings({});
    setLastDeckKind("study");
    setMode("study");
  };

  const vocabCards = ALL_CARDS.filter(c => c.kind === "vocab" && selectedUnits.includes(c.unit));
  const vocabDueCards = vocabCards.filter(c => isDue(c.id, progress));
  const startVocab = (dueOnly = false) => {
    const source = dueOnly ? vocabDueCards : vocabCards;
    const shuffled = shuffle(source);
    setDeck(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setShowExample(false);
    setRatings({});
    setLastDeckKind("vocab");
    setMode("study");
  };

  const MIXED_MIN_SIZE = 12; // si hay menos pendientes que esto, se completa con tarjetas no vencidas

  const startMixed = () => {
    const dueIds = new Set(dueCards.map(c => c.id));
    let source = dueCards;
    if (source.length < MIXED_MIN_SIZE) {
      const filler = ALL_CARDS.filter(c => selectedUnits.includes(c.unit) && !dueIds.has(c.id));
      const shuffledFiller = shuffle(filler);
      const needed = MIXED_MIN_SIZE - source.length;
      source = [...source, ...shuffledFiller.slice(0, needed)];
    }
    const shuffled = shuffle(source);
    setMixedQueue(shuffled);
    setMixedIdx(0);
    setMixedFlipped(false);
    setMode("mixed");
  };

  const advanceMixed = () => {
    setMixedFlipped(false);
    if (mixedIdx + 1 >= mixedQueue.length) {
      setMode("menu");
    } else {
      setMixedIdx(i => i + 1);
    }
  };

  // Califica la tarjeta actual de la sesión mixta y, si tiene un carácter
  // practicable, encadena la práctica de escritura de ese carácter antes de
  // avanzar a la siguiente tarjeta (reutiliza tal cual la pantalla "writing").
  const rateMixed = (r) => {
    const mc = mixedQueue[mixedIdx];
    setProgress(prev => {
      const updated = { ...prev, [mc.id]: computeNextEntry(prev[mc.id], r) };
      saveProgress(updated);
      return updated;
    });
    recordActivity(streak, setStreak);
    window.speechSynthesis.cancel();
    const chars = Array.from(mc.zh).filter(ch => STROKES_DATA && STROKES_DATA[ch]);
    if (chars.length > 0) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      setWriteDeck([ch]);
      setWriteIdx(0);
      setWriteComplete(false);
      setMixedFromWrite(true);
      setMode("writing");
    } else {
      advanceMixed();
    }
  };

  const mixedCard = mixedQueue[mixedIdx];
  const mixedColor = mixedCard ? (UNIT_COLORS[mixedCard.unit] || UNIT_COLORS[1]) : UNIT_COLORS[1];

  const card = deck[currentIdx];
  const color = card ? (UNIT_COLORS[card.unit] || UNIT_COLORS[1]) : UNIT_COLORS[1];
  const isReference = isPatternCard(card);

  const rate = (r) => {
    haptic(r === RATING.know ? 15 : r === RATING.almost ? 10 : [25, 35, 25]);
    setRatings(prev => ({ ...prev, [card.id]: r }));
    setProgress(prev => {
      const updated = { ...prev, [card.id]: computeNextEntry(prev[card.id], r) };
      saveProgress(updated);
      return updated;
    });
    recordActivity(streak, setStreak);
    setAnimating(true);
    window.speechSynthesis.cancel();
    setTimeout(() => {
      setFlipped(false);
      setShowExample(false);
      setAnimating(false);
      setDragX(0);
      if (currentIdx + 1 >= deck.length) {
        setMode("results");
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 300);
  };

  const prevCard = () => {
    if (currentIdx === 0) return;
    setCurrentIdx(i => i - 1);
    setFlipped(false);
    setShowExample(false);
    setDragX(0);
  };

  const SWIPE_THRESHOLD = 90;
  const onCardPointerDown = (e) => {
    if (!flipped || animating) return;
    // No capturar el puntero si el toque empezó en un botón/control interno
    // (Escuchar, Ver ejemplo, revelar pinyin/traducción) — capturarlo ahí le
    // roba el pointerup a ese botón y el click nunca llega a dispararse.
    if (e.target.closest && e.target.closest("button")) return;
    dragStartXRef.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onCardPointerMove = (e) => {
    if (!dragging || dragStartXRef.current === null) return;
    setDragX(e.clientX - dragStartXRef.current);
  };
  const onCardPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    dragStartXRef.current = null;
    if (dragX > SWIPE_THRESHOLD) {
      setDragX(600);
      rate(RATING.know);
    } else if (dragX < -SWIPE_THRESHOLD) {
      setDragX(-600);
      rate(RATING.dontKnow);
    } else {
      setDragX(0);
    }
  };

  // Auto-play audio when card flips to reveal Chinese (algunas fichas de
  // referencia mezclan texto en español/pinyin en el campo zh — esas no se leen)
  useEffect(() => {
    if (flipped && autoPlay && card && isSpeakableZh(card.zh)) speak(card.zh);
  }, [flipped, card?.id]);

  // Modo "solo audio": reproduce apenas aparece la tarjeta (antes de revelar),
  // para que el reto sea reconocer de oído en vez de leer el carácter primero.
  useEffect(() => {
    if (studyDir === "listen" && !flipped && card && isSpeakableZh(card.zh)) speak(card.zh);
  }, [studyDir, card?.id]);

  const toggleUnit = (u) => {
    setSelectedUnits(prev =>
      prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]
    );
  };

  const ratedCount = Object.keys(ratings).length;
  const knowCount = Object.values(ratings).filter(r => r === RATING.know).length;
  const almostCount = Object.values(ratings).filter(r => r === RATING.almost).length;
  const dontCount = Object.values(ratings).filter(r => r === RATING.dontKnow).length;

  const back_zh = card?.zh;
  const back_py = card?.py;
  const back_es = cardText(card, "es", lang);

  if (mode === "menu") return (
    <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", paddingBottom: "calc(24px + 76px + env(safe-area-inset-bottom, 0px))", fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h1 style={{ color: "#FF9D3D", fontSize: 24, fontWeight: "bold", margin: 0, letterSpacing: 1 }}>🏯 长城汉语</h1>
          <SettingsGearButton setMode={setMode} />
        </div>

        {/* Racha + progreso general */}
        {hasHistory ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 16, marginBottom: 14 }}>
            <ProgressRing pct={masteredPct} lang={lang} />
            <div style={{ flex: 1 }}>
              {streak.current > 0 && (
                <p style={{ color: "#FF9D3D", fontSize: 15, fontWeight: "bold", margin: "0 0 6px 0", fontFamily: FONT_UI }}>
                  🔥 {streak.current} {streak.current === 1 ? t("dia_seguido", lang) : t("dias_seguidos", lang)}
                </p>
              )}
              <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: FONT_UI, flexWrap: "wrap" }}>
                <span style={{ color: TEXT_3 }}>🆕 {newCount}</span>
                <span style={{ color: "#FF9D3D" }}>📖 {learningCount}</span>
                <span style={{ color: "#4CAF50" }}>⭐ {masteredCount}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: "18px 16px", marginBottom: 14, textAlign: "center" }}>
            <p style={{ color: "#FF9D3D", fontSize: 15, fontWeight: "bold", margin: "0 0 4px 0", fontFamily: FONT_UI }}>{t("bienvenido_title", lang)}</p>
            <p style={{ color: "#aaa", fontSize: 12, margin: 0, fontFamily: FONT_UI }}>{t("bienvenido_hint", lang)}</p>
          </div>
        )}

        {/* Repaso de hoy */}
        <div style={{
          background: dueCount > 0 ? GRAD_PRIMARY : "rgba(76,175,80,0.12)",
          borderRadius: 16, padding: 18, marginBottom: 14,
          border: dueCount > 0 ? "none" : "2px solid rgba(76,175,80,0.35)"
        }}>
          {dueCount > 0 ? (
            <>
              <p style={{ color: "rgba(255,255,255,0.97)", fontSize: 13, fontWeight: 600, margin: "0 0 2px 0", fontFamily: FONT_UI }}><Lbl icon="calendar" size={16} gap={6}>{noEmoji(t("repaso_hoy_title", lang))}</Lbl></p>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, margin: "0 0 10px 0", fontFamily: FONT_UI }}>
                {t("repaso_hoy_hint", lang)}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ color: "white", fontSize: 22, fontWeight: "bold", fontFamily: FONT_UI }}>{dueCount} {t("tarjetas_suffix", lang)}</span>
                  <div style={{ color: "rgba(255,255,255,0.95)", fontSize: 12, marginTop: 2, fontFamily: FONT_UI }}>
                    {[newDueCount > 0 && `🆕 ${newDueCount} ${t("nuevas_suffix", lang)}`, reviewDueCount > 0 && `🔁 ${reviewDueCount} ${t("repaso_suffix", lang)}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button onClick={startReviewToday} style={{
                  background: "white", color: "#C23B0F", border: "none", borderRadius: 14,
                  padding: "10px 20px", fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: FONT_UI
                }}>
                  {t("repasar_btn", lang)}
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: "#4CAF50", fontSize: 14, margin: 0, fontFamily: FONT_UI, textAlign: "center" }}>
              {t("repaso_completo", lang)}
            </p>
          )}
        </div>

        {/* Navegación principal */}
        <button onClick={startStudy} disabled={selectedUnits.length === 0} style={{
          width: "100%", padding: "18px 0", borderRadius: 16, border: "none", marginBottom: 4,
          background: selectedUnits.length === 0 ? "#444" : GRAD_PRIMARY,
          color: "white", fontSize: 17, fontWeight: "bold", cursor: selectedUnits.length === 0 ? "not-allowed" : "pointer",
          fontFamily: FONT_UI, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(255,107,53,0.35)"
        }}>
          <Lbl icon="layers" size={21}>{noEmoji(t("flashcards_btn", lang))} · {ALL_CARDS.filter(c => selectedUnits.includes(c.unit)).length} {t("tarjetas_suffix", lang)}</Lbl>
        </button>
        <p style={{ textAlign: "center", color: TEXT_3, fontSize: 11, margin: "0 0 10px 0", fontFamily: FONT_UI }}>
          {hasHistory
            ? `${studyDir === "es→zh" ? t("dir_short_prompt_zh", lang) : t("dir_short_zh_prompt", lang)} · ${selectedUnits.length} ${t("cambiar_en_opciones", lang)}`
            : t("home_subtitle_welcome", lang)}
        </p>

        {/* Modos secundarios en grilla 2x2 — menos scroll, se ve más panel que lista */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <button onClick={() => setMode("buildHub")} style={{
            padding: "14px 8px", borderRadius: 16, border: "none",
            background: GRAD_BUILD,
            color: "white", cursor: "pointer", fontFamily: FONT_UI,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4
          }}>
            <Icon name="build" size={26} />
            <span style={{ fontSize: 13, fontWeight: "bold", textAlign: "center" }}>{t("construir_frases", lang)}</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>{buildableCards.length} {t("disponibles_suffix", lang)}</span>
          </button>

          <button onClick={() => setMode("patterns")} style={{
            padding: "14px 8px", borderRadius: 16,
            border: "2px solid rgba(255,157,61,0.4)", background: "rgba(255,157,61,0.08)",
            color: "#FF9D3D", cursor: "pointer", fontFamily: FONT_UI,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4
          }}>
            <Icon name="patterns" size={26} />
            <span style={{ fontSize: 13, fontWeight: "bold", textAlign: "center" }}>{t("patrones_gramaticales", lang)}</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>{PATTERN_CATEGORIES.reduce((sum, c) => sum + categoryCards(c).length, 0)}</span>
          </button>

          <button onClick={startMixed} disabled={dueCards.length === 0 && ALL_CARDS.filter(c => selectedUnits.includes(c.unit)).length === 0} style={{
            gridColumn: "1 / -1", padding: "12px 8px", borderRadius: 16, border: "2px solid rgba(123,31,162,0.4)",
            background: "rgba(123,31,162,0.1)", color: "#BA68C8", fontSize: 14, fontWeight: "bold",
            cursor: "pointer", fontFamily: FONT_UI
          }}>
            <Lbl icon="shuffle" size={18}>{noEmoji(t("sesion_mixta", lang))}</Lbl>
          </button>
        </div>
      </div>
      <TabBar activeMode={mode} setMode={setMode} lang={lang} />
    </div>
  );

  // Pantalla de opciones: dirección, audio, pinyin, selector de unidades, reiniciar progreso
  if (mode === "settings") return (
    <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", paddingBottom: "calc(24px + 76px + env(safe-area-inset-bottom, 0px))", fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 500, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ color: "#FF9D3D", fontSize: 15, fontWeight: "bold", fontFamily: FONT_UI }}>{t("opciones_title", lang)}</span>
        </div>

        {/* Idioma */}
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <p style={{ color: TEXT_2, fontSize: 13, margin: "0 0 10px 0", fontFamily: FONT_UI }}>{t("idioma_title", lang)}</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { v: "es", label: "🇲🇽 Español" },
              { v: "en", label: "🇺🇸 English" },
              { v: "fr", label: "🇫🇷 Français" },
            ].map(l => (
              <button key={l.v} onClick={() => setLang(l.v)} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "2px solid",
                borderColor: lang === l.v ? "#FF6B35" : "rgba(255,255,255,0.2)",
                background: lang === l.v ? "rgba(255,107,53,0.2)" : "transparent",
                color: lang === l.v ? "#FF9D3D" : "#aaa",
                cursor: "pointer", fontFamily: FONT_UI, fontSize: 13, fontWeight: lang === l.v ? "bold" : "normal"
              }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <p style={{ color: TEXT_2, fontSize: 13, margin: "0 0 10px 0", fontFamily: FONT_UI }}>{t("direccion_title", lang)}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { v: "es→zh", key: "dir_prompt_zh" },
              { v: "zh→es", key: "dir_zh_prompt" },
              { v: "listen", key: "dir_listen" },
            ].map(d => (
              <button key={d.v} onClick={() => setStudyDir(d.v)} style={{
                flex: "1 1 30%", padding: "10px 4px", borderRadius: 10, border: "2px solid",
                borderColor: studyDir === d.v ? "#FF6B35" : "rgba(255,255,255,0.2)",
                background: studyDir === d.v ? "rgba(255,107,53,0.2)" : "transparent",
                color: studyDir === d.v ? "#FF9D3D" : "#aaa",
                cursor: "pointer", fontFamily: FONT_UI, fontSize: 12, fontWeight: studyDir === d.v ? "bold" : "normal"
              }}>
                {t(d.key, lang)}
              </button>
            ))}
          </div>
          <p style={{ color: TEXT_3, fontSize: 11, margin: "8px 0 0 0", fontFamily: FONT_UI }}>
            {t("dir_listen_hint", lang)}
          </p>
        </div>

        {/* Toggles */}
        {[
          { key: "toggle_audio", val: autoPlay, set: setAutoPlay },
          { key: "toggle_pinyin", val: showPinyin, set: setShowPinyin },
          { key: "toggle_haptics", val: haptics, set: setHaptics },
        ].map(toggle => (
          <div key={toggle.key} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "12px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: TEXT_2, fontSize: 13, fontFamily: FONT_UI }}>{t(toggle.key, lang)}</span>
            <div onClick={() => toggle.set(p => !p)} style={{
              width: 44, height: 24, borderRadius: 12, background: toggle.val ? "#EF6C00" : "#7A6A5C",
              cursor: "pointer", position: "relative", transition: "background 0.3s"
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "white",
                position: "absolute", top: 2, left: toggle.val ? 22 : 2, transition: "left 0.3s"
              }} />
            </div>
          </div>
        ))}
        {/* Límite diario de repaso */}
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <p style={{ color: TEXT_2, fontSize: 13, margin: "0 0 4px 0", fontFamily: FONT_UI }}>{t("limite_diario_title", lang)}</p>
          <p style={{ color: TEXT_3, fontSize: 11, margin: "0 0 10px 0", fontFamily: FONT_UI }}>{t("limite_diario_hint", lang)}</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 20, 40, 60].map(n => (
              <button key={n} onClick={() => setDailyCap(n)} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "2px solid",
                borderColor: dailyCap === n ? "#FF6B35" : "rgba(255,255,255,0.2)",
                background: dailyCap === n ? "rgba(255,107,53,0.2)" : "transparent",
                color: dailyCap === n ? "#FF9D3D" : "#aaa",
                cursor: "pointer", fontFamily: FONT_UI, fontSize: 13, fontWeight: dailyCap === n ? "bold" : "normal"
              }}>
                {n === 0 ? t("sin_limite", lang) : n}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 6 }} />

        {/* Unit selector con % de dominio */}
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ color: TEXT_2, fontSize: 13, margin: 0, fontFamily: FONT_UI }}>{t("seleccionar_unidades", lang)}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelectedUnits([...units])} style={{ color: "#FF9D3D", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontFamily: FONT_UI }}>{t("todas", lang)}</button>
              <button onClick={() => setSelectedUnits([])} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontFamily: FONT_UI }}>{t("ninguna", lang)}</button>
            </div>
          </div>

          {/* Book 1 - Textbook units 1-10 */}
          <p style={{ color: "#FF9D3D", fontSize: 11, margin: "0 0 6px 0", fontFamily: FONT_UI, fontWeight: "bold", letterSpacing: 1 }}>{t("libro1_unidades", lang)}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 12 }}>
            {units.filter(u => bookInfo(u)?.book === 1).map(u => {
              const uc = UNIT_COLORS[u];
              const sel = selectedUnits.includes(u);
              const pct = unitMastery(u);
              return (
                <button key={u} onClick={() => toggleUnit(u)} style={{
                  padding: "8px 4px", borderRadius: 10, border: `2px solid ${sel ? uc.accent : "rgba(255,255,255,0.1)"}`,
                  background: sel ? uc.accent : "transparent",
                  color: sel ? "white" : "#888", cursor: "pointer", fontSize: 10,
                  fontFamily: FONT_UI, fontWeight: sel ? "bold" : "normal",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2
                }}>
                  <span style={{ fontSize: 12 }}>U{bookInfo(u).num}</span>
                  <span style={{ fontSize: 9, opacity: 0.85 }}>{pct > 0 ? `⭐${pct}%` : "—"}</span>
                </button>
              );
            })}
          </div>

          {/* Book 2 */}
          <p style={{ color: "#00838F", fontSize: 11, margin: "0 0 6px 0", fontFamily: FONT_UI, fontWeight: "bold", letterSpacing: 1 }}>{t("libro2", lang)}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 12 }}>
            {units.filter(u => bookInfo(u)?.book === 2).map(u => {
              const uc = UNIT_COLORS[u];
              const sel = selectedUnits.includes(u);
              const pct = unitMastery(u);
              return (
                <button key={u} onClick={() => toggleUnit(u)} style={{
                  padding: "8px 4px", borderRadius: 10, border: `2px solid ${sel ? uc.accent : "rgba(255,255,255,0.1)"}`,
                  background: sel ? uc.accent : "transparent",
                  color: sel ? "white" : "#888", cursor: "pointer", fontSize: 10,
                  fontFamily: FONT_UI, fontWeight: sel ? "bold" : "normal",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2
                }}>
                  <span style={{ fontSize: 12 }}>U{bookInfo(u).num}</span>
                  <span style={{ fontSize: 9, opacity: 0.85 }}>{pct > 0 ? `⭐${pct}%` : "—"}</span>
                </button>
              );
            })}
          </div>

          {/* Book 3 */}
          <p style={{ color: "#0277BD", fontSize: 11, margin: "0 0 6px 0", fontFamily: FONT_UI, fontWeight: "bold", letterSpacing: 1 }}>{t("libro3", lang)}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {units.filter(u => bookInfo(u)?.book === 3).map(u => {
              const uc = UNIT_COLORS[u];
              const sel = selectedUnits.includes(u);
              const pct = unitMastery(u);
              return (
                <button key={u} onClick={() => toggleUnit(u)} style={{
                  padding: "8px 4px", borderRadius: 10, border: `2px solid ${sel ? uc.accent : "rgba(255,255,255,0.1)"}`,
                  background: sel ? uc.accent : "transparent",
                  color: sel ? "white" : "#888", cursor: "pointer", fontSize: 10,
                  fontFamily: FONT_UI, fontWeight: sel ? "bold" : "normal",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2
                }}>
                  <span style={{ fontSize: 12 }}>U{bookInfo(u).num}</span>
                  <span style={{ fontSize: 9, opacity: 0.85 }}>{pct > 0 ? `⭐${pct}%` : "—"}</span>
                </button>
              );
            })}
          </div>

          <p style={{ color: TEXT_3, fontSize: 12, margin: "10px 0 0 0", fontFamily: FONT_UI, textAlign: "center" }}>
            {ALL_CARDS.filter(c => selectedUnits.includes(c.unit)).length} {t("tarjetas_seleccionadas", lang)}
          </p>
        </div>

        <p onClick={resetProgress} style={{ textAlign: "center", color: TEXT_3, fontSize: 11, marginTop: 8, cursor: "pointer", fontFamily: FONT_UI, textDecoration: "underline" }}>
          {t("reiniciar_progreso", lang)}
        </p>
      </div>
      <TabBar activeMode={mode} setMode={setMode} lang={lang} />
    </div>
  );

  if (mode === "results") return (
    <ResultsScreen
      icon="trophy" title={t("ronda_completada", lang)} titleColor="#FFA726"
      subtitle={`${deck.length} ${t("tarjetas_estudiadas", lang)}`}
      stats={[
        { label: t("stat_las_se", lang), count: knowCount, color: "#4CAF50" },
        { label: t("stat_casi", lang), count: almostCount, color: "#FF9D3D" },
        { label: t("stat_repasar", lang), count: dontCount, color: "#F44336" },
      ]}
      actions={[
        dueCount > 0 && {
          label: `${t("seguir_repaso_hoy", lang)} (${dueCount} ${t("pendientes_suffix", lang)})`, onClick: startReviewToday,
          background: GRAD_PRIMARY, color: "white", fontSize: 15, bold: true, icon: "calendar",
        },
        {
          label: t("repasar_fallidas", lang), icon: "repeat",
          onClick: () => {
            const dontKnow = deck.filter(c => ratings[c.id] === RATING.dontKnow || ratings[c.id] === RATING.almost);
            if (dontKnow.length === 0) { startStudy(); return; }
            setDeck(shuffle(dontKnow));
            setCurrentIdx(0); setFlipped(false); setRatings({}); setMode("study");
          },
          border: dueCount > 0 ? "2px solid rgba(255,107,53,0.4)" : "none",
          background: dueCount > 0 ? "transparent" : GRAD_PRIMARY,
          color: dueCount > 0 ? "#FF9D3D" : "white", fontSize: 15, bold: true,
        },
        { label: t("construir_con_unidades", lang), icon: "build", onClick: startBuild, disabled: buildableCards.length === 0, border: "2px solid rgba(0,131,143,0.4)", color: "#4DD0E1", fontSize: 14 },
        { label: t("nueva_ronda", lang), icon: "shuffle", onClick: () => (lastDeckKind === "vocab" ? startVocab() : startStudy()), color: TEXT_3, fontSize: 13 },
        { label: t("menu_principal", lang), icon: "home", onClick: () => setMode("menu"), color: TEXT_3, fontSize: 14 },
      ]}
    />
  );

  // Modo: lista de categorías de patrones
  if (mode === "patterns") return (
    <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", paddingBottom: "calc(20px + 76px + env(safe-area-inset-bottom, 0px))", fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <span style={{ flex: 1 }} />
          <span style={{ color: "#FF9D3D", fontSize: 16, fontWeight: "bold", textAlign: "center" }}><Lbl icon="patterns" size={19}>{noEmoji(t("patrones_title", lang))}</Lbl></span>
          <span style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <SettingsGearButton setMode={setMode} />
          </span>
        </div>
        <p style={{ color: TEXT_2, fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
          {t("patrones_desc", lang)}
        </p>

        {PATTERN_CATEGORIES.map(cat => {
          const count = categoryCards(cat).length;
          const pct = categoryMastery(cat);
          return (
            <button key={cat.key} onClick={() => openCategory(cat)} style={{
              width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 18px", borderRadius: 18, marginBottom: 10,
              border: `1px solid ${cat.color}44`, background: `linear-gradient(135deg, ${cat.color}26, ${cat.color}0d)`,
              boxShadow: `inset 4px 0 0 ${cat.color}`,
              cursor: "pointer", textAlign: "left"
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{cat.icon}</span>
                <span style={{ color: "white", fontSize: 15, fontWeight: "bold" }}>{categoryLabel(cat, lang)}</span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span style={{ color: count > 0 ? "#fff" : TEXT_3, background: count > 0 ? `${cat.color}66` : "rgba(255,255,255,0.06)", borderRadius: 12, padding: "2px 10px", fontSize: 13, fontWeight: "bold" }}>{count} →</span>
                <span style={{ color: pct > 0 ? "#81C784" : TEXT_3, fontSize: 11, fontFamily: FONT_UI }}>{pct > 0 ? `⭐${pct}%` : "—"}</span>
              </span>
            </button>
          );
        })}
      </div>
      <TabBar activeMode={mode} setMode={setMode} lang={lang} />
    </div>
  );

  // Modo: detalle de una categoría — referencia + practicar
  if (mode === "patternDetail" && selectedCategory) {
    const cat = selectedCategory;
    const cards = categoryCards(cat);
    return (
      <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", fontFamily: FONT_UI }}>
        <div style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button onClick={() => setMode("patterns")} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>{t("categorias_back", lang)}</button>
            <span style={{ color: cat.color, fontSize: 13, fontWeight: "bold" }}>{cards.length} {t("patrones_suffix", lang)}</span>
          </div>
          <h2 style={{ color: "white", fontSize: 20, textAlign: "center", margin: "6px 0 20px 0" }}>{cat.icon} {categoryLabel(cat, lang)}</h2>

          {cards.length === 0 && (
            <p style={{ color: TEXT_3, fontSize: 13, textAlign: "center", lineHeight: 1.5, margin: "0 0 20px 0" }}>
              {t("pattern_empty", lang)}
            </p>
          )}

          {cards.map(c => (
            <div key={c.id} style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
              borderLeft: `4px solid ${cat.color}`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <span style={{ display: "inline-block", color: cat.color, fontSize: 10, fontWeight: "bold", background: `${cat.color}18`, borderRadius: 20, padding: "2px 8px", marginBottom: 6 }}>
                    {displayUnitName(c, lang)}
                  </span>
                  <p style={{ color: "white", fontSize: 17, fontWeight: "bold", margin: "0 0 2px 0" }}>{c.zh}</p>
                  {showPinyin && <p style={{ fontSize: 12, fontStyle: "italic", margin: "0 0 6px 0", color: TONE_COLORS_DARK[0] }}>{renderPinyinTone(c.py, true)}</p>}
                </div>
                <SpeakButton text={c.zh.replace(/[❌✅]/g, "")} speak={speak} speaking={speaking} color={cat.color} lang={lang} />
              </div>
              <p style={{ color: "#ccc", fontSize: 13, margin: "0 0 8px 0", lineHeight: 1.4 }}>{cardText(c, "es", lang)}</p>
              <div style={{ background: `${cat.color}12`, borderRadius: 10, padding: "8px 12px" }}>
                <p style={{ color: cat.color, fontSize: 13, margin: "0 0 2px 0" }}>{c.exZh}</p>
                {showPinyin && <p style={{ fontSize: 11, margin: "0 0 2px 0", fontStyle: "italic", color: TONE_COLORS_DARK[0] }}>{renderPinyinTone(c.exPy, true)}</p>}
                <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>{cardText(c, "exEs", lang)}</p>
              </div>
            </div>
          ))}

          <button onClick={() => practiceCategory(cat)} disabled={cards.length === 0} style={{
            width: "100%", padding: "16px 0", borderRadius: 16, border: "none", marginTop: 12,
            background: cards.length === 0 ? "#444" : `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`, color: "white",
            fontSize: 15, fontWeight: "bold", cursor: cards.length === 0 ? "not-allowed" : "pointer"
          }}>
            <Lbl icon="play" size={16}>{noEmoji(t("practicar_patrones", lang))}</Lbl>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "buildResults") return (
    <ResultsScreen
      icon="build" title={t("ronda_frases_completada", lang)} titleColor="#4DD0E1"
      subtitle={`${buildDeck.length} ${t("frases_construidas", lang)}`}
      stats={[
        { label: t("a_la_primera", lang), count: buildStats.correct, color: "#66BB6A" },
        { label: t("con_errores", lang), count: buildStats.wrong, color: "#FF8A80" },
      ]}
      actions={[
        { label: t("otra_ronda", lang), icon: "shuffle", onClick: startBuild, background: GRAD_BUILD, color: "white", fontSize: 15, bold: true },
        { label: t("repasar_flashcards", lang), icon: "layers", onClick: startStudy, border: "1px solid rgba(255,107,53,0.5)", color: "#FF9D3D", fontSize: 14 },
        dueCount > 0 && { label: tn("tienes_pendientes_hoy", lang, dueCount), icon: "calendar", onClick: startReviewToday, color: TEXT_3, fontSize: 13 },
        { label: t("menu_principal", lang), icon: "home", onClick: () => setMode("menu"), color: TEXT_3, fontSize: 14 },
      ]}
    />
  );

  const tallyStatus = (ids, map) => {
    const c = { mastered: 0, learning: 0, new: 0 };
    ids.forEach(id => { c[statusFor(id, map)]++; });
    return c;
  };
  const buildCounts = tallyStatus(buildableCards.map(c => c.id), progress);
  const vocabCounts = tallyStatus(vocabCards.map(c => c.id), progress);
  const charCounts = tallyStatus(writableChars, charProgress);

  // Tab: Construir — elegir nivel y empezar
  if (mode === "buildHub") return (
    <HubScreen title={t("construir_frases_title", lang)} icon="build" titleColor="#4DD0E1" mode={mode} setMode={setMode} lang={lang}
      description={t("construir_desc", lang)}>
      <ProgressSummary title={t("prog_title_build", lang)} counts={buildCounts} lang={lang} />
      <div style={{ background: "rgba(255,255,255,0.05)", border: CARD_BORDER, borderRadius: 18, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[
            { v: "easy", key: "nivel_facil" },
            { v: "medium", key: "nivel_medio" },
            { v: "hard", label: "听写" },
          ].map(lv => (
            <button key={lv.v} onClick={() => setBuilderLevel(lv.v)} style={{
              flex: 1, minHeight: 40, padding: "8px 0", borderRadius: 12, border: `1px solid ${builderLevel === lv.v ? "#4DD0E1" : "rgba(255,255,255,0.15)"}`,
              background: builderLevel === lv.v ? "rgba(77,208,225,0.16)" : "transparent",
              color: builderLevel === lv.v ? "#4DD0E1" : TEXT_2, fontSize: 13, fontWeight: builderLevel === lv.v ? "bold" : "normal",
              cursor: "pointer", fontFamily: FONT_UI
            }}>
              <Lbl gap={7}><LevelDot color={LEVEL_COLORS[lv.v]} />{lv.key ? noEmoji(t(lv.key, lang)) : lv.label}</Lbl>
            </button>
          ))}
        </div>
        <p style={{ color: TEXT_3, fontSize: 12, lineHeight: 1.45, margin: "0 2px 12px" }}>
          {t(builderLevel === "hard" ? "nivel_hard_desc" : builderLevel === "medium" ? "nivel_medio_desc" : "nivel_facil_desc", lang)}
        </p>
        <button onClick={startBuild} disabled={buildableCards.length === 0} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: buildableCards.length === 0 ? "#444" : GRAD_BUILD,
          color: "white", fontSize: 15, fontWeight: "bold",
          cursor: buildableCards.length === 0 ? "not-allowed" : "pointer", fontFamily: FONT_UI
        }}>
          <Lbl icon="play" size={16}>{t("comenzar", lang)} · {buildableCards.length} {t("disponibles_suffix", lang)}</Lbl>
        </button>
      </div>
    </HubScreen>
  );

  // Tab: Escritura — practicar el orden de trazos de los caracteres
  if (mode === "writingHub") return (
    <HubScreen title={t("escritura_title", lang)} icon="writing" titleColor="#FF8A50" mode={mode} setMode={setMode} lang={lang}>
      <p style={{ color: TEXT_2, fontSize: 13, textAlign: "center", marginBottom: 12, lineHeight: 1.5 }}>
        {t("escritura_desc", lang)}
      </p>
      <ProgressSummary title={t("prog_title_chars", lang)} counts={charCounts} lang={lang} />

      <button onClick={() => setMode("settings")} style={{
        display: "block", margin: "0 auto 20px", background: "none", border: "none",
        color: "#C6501F", fontSize: 12, cursor: "pointer", textDecoration: "underline"
      }}>
        {selectedUnits.length} {t("cambiar_en_opciones", lang)}
      </button>

      {writeDueChars.length > 0 && (
        <button onClick={() => startWriting(true)} style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 16px", borderRadius: 14, marginBottom: 10, border: "none",
          background: GRAD_PRIMARY, color: "white", cursor: "pointer", fontFamily: FONT_UI
        }}>
          <span style={{ fontSize: 13, fontWeight: "bold" }}><Lbl icon="calendar" size={16} gap={8}>{noEmoji(t("repasar_pendientes_hoy", lang))}</Lbl></span>
          <span style={{ fontSize: 13, fontWeight: "bold" }}>{writeDueChars.length} →</span>
        </button>
      )}

      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>{writableChars.slice(0, 6).join(" ")}</div>
        <button onClick={() => startWriting(false)} disabled={writableChars.length === 0} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: writableChars.length === 0 ? "#444" : GRAD_PRIMARY,
          color: "white", fontSize: 15, fontWeight: "bold",
          cursor: writableChars.length === 0 ? "not-allowed" : "pointer", fontFamily: FONT_UI
        }}>
          <Lbl icon="play" size={16}>{t("comenzar", lang)} · {writableChars.length} {t("caracteres_suffix", lang)}</Lbl>
        </button>
      </div>
      {writableChars.length === 0 && (
        <p style={{ color: TEXT_3, fontSize: 12, textAlign: "center" }}>
          {t("selecciona_unidades_chars", lang)}
        </p>
      )}

      <button onClick={() => { setMasteryKind("chars"); setMasteryFilter("all"); setMode("mastery"); }} style={{
        display: "block", width: "100%", marginTop: 14, padding: "10px 0", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.15)", background: "none",
        color: TEXT_2, fontSize: 13, cursor: "pointer", fontFamily: FONT_UI
      }}>
        <Lbl icon="chart" size={16}>{noEmoji(t("ver_que_caracteres_domino", lang))}</Lbl>
      </button>
    </HubScreen>
  );

  // Tab: Vocabulario — solo los términos, con su ejemplo como contexto
  if (mode === "vocabHub") return (
    <HubScreen title={t("vocab_title", lang)} icon="vocab" titleColor="#26C6DA" mode={mode} setMode={setMode} lang={lang}
      description={t("vocab_desc", lang)}>
      <ProgressSummary title={t("prog_title_vocab", lang)} counts={vocabCounts} lang={lang} />
      {vocabDueCards.length > 0 && (
        <button onClick={() => startVocab(true)} style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 16px", borderRadius: 14, marginBottom: 10, border: "none",
          background: GRAD_BUILD, color: "white", cursor: "pointer", fontFamily: FONT_UI
        }}>
          <span style={{ fontSize: 13, fontWeight: "bold" }}><Lbl icon="calendar" size={16} gap={8}>{noEmoji(t("repasar_pendientes_hoy", lang))}</Lbl></span>
          <span style={{ fontSize: 13, fontWeight: "bold" }}>{vocabDueCards.length} →</span>
        </button>
      )}
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 14, textAlign: "center" }}>
        <button onClick={() => startVocab(false)} disabled={vocabCards.length === 0} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: vocabCards.length === 0 ? "#444" : GRAD_BUILD,
          color: "white", fontSize: 15, fontWeight: "bold",
          cursor: vocabCards.length === 0 ? "not-allowed" : "pointer", fontFamily: FONT_UI
        }}>
          <Lbl icon="play" size={16}>{t("comenzar", lang)} · {vocabCards.length} {t("terminos_suffix", lang)}</Lbl>
        </button>
      </div>
      {vocabCards.length === 0 && (
        <p style={{ color: TEXT_3, fontSize: 12, textAlign: "center" }}>
          {t("vocab_empty", lang)}
        </p>
      )}

      <button onClick={() => { setMasteryKind("vocab"); setMasteryFilter("all"); setMode("mastery"); }} style={{
        display: "block", width: "100%", marginTop: 14, padding: "10px 0", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.15)", background: "none",
        color: TEXT_2, fontSize: 13, cursor: "pointer", fontFamily: FONT_UI
      }}>
        <Lbl icon="chart" size={16}>{noEmoji(t("ver_que_palabras_domino", lang))}</Lbl>
      </button>
    </HubScreen>
  );

  // Modo: Dominio — navega qué palabras/caracteres ya dominás, aprendiendo o
  // todavía nuevos, dentro de tus unidades seleccionadas. No es un modo de
  // estudio, solo una vista del progreso que ya guarda el SRS (progress/charProgress).
  if (mode === "mastery") {
    const isVocab = masteryKind === "vocab";
    const items = isVocab
      ? vocabCards.map(c => ({ id: c.id, zh: c.zh, py: c.py, text: cardText(c, "es", lang), status: statusFor(c.id, progress) }))
      : writableChars.map(ch => ({ id: ch, zh: ch, py: CHAR_PINYIN[ch] || "", text: "", status: statusFor(ch, charProgress) }));
    const counts = {
      all: items.length,
      mastered: items.filter(i => i.status === "mastered").length,
      learning: items.filter(i => i.status === "learning").length,
      new: items.filter(i => i.status === "new").length,
    };
    const filtered = masteryFilter === "all" ? items : items.filter(i => i.status === masteryFilter);
    const STATUS_LABELS = { mastered: t("status_dominada", lang), learning: t("status_aprendiendo", lang), new: t("status_nueva", lang) };
    const STATUS_COLORS = { mastered: "#66BB6A", learning: "#FFA726", new: TEXT_3 };

    return (
      <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", fontFamily: FONT_UI }}>
        <div style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button onClick={() => setMode(isVocab ? "vocabHub" : "writingHub")} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>{t("menu_back", lang)}</button>
            <span style={{ color: TEXT_2, fontSize: 13 }}>{selectedUnits.length} {t("unidades_suffix", lang)}</span>
          </div>
          <h2 style={{ color: "white", fontSize: 20, textAlign: "center", margin: "6px 0 16px 0" }}><Lbl icon="chart" size={22}>{isVocab ? t("mastery_title_vocab", lang) : t("mastery_title_chars", lang)}</Lbl></h2>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={() => { setMasteryKind("vocab"); setMasteryFilter("all"); }} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: `2px solid ${isVocab ? "#00ACC1" : "rgba(255,255,255,0.15)"}`,
              background: isVocab ? "rgba(0,172,193,0.15)" : "transparent", color: isVocab ? "#4DD0E1" : "#888",
              fontSize: 13, fontWeight: isVocab ? "bold" : "normal", cursor: "pointer", fontFamily: FONT_UI
            }}><Lbl icon="vocab" size={16} gap={6}>{noEmoji(t("tab_palabras", lang))}</Lbl></button>
            <button onClick={() => { setMasteryKind("chars"); setMasteryFilter("all"); }} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: `2px solid ${!isVocab ? "#C6501F" : "rgba(255,255,255,0.15)"}`,
              background: !isVocab ? "rgba(198,80,31,0.15)" : "transparent", color: !isVocab ? "#FF9D3D" : "#888",
              fontSize: 13, fontWeight: !isVocab ? "bold" : "normal", cursor: "pointer", fontFamily: FONT_UI
            }}><Lbl icon="writing" size={16} gap={6}>{noEmoji(t("tab_caracteres", lang))}</Lbl></button>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { key: "all", label: `${t("filter_todas", lang)} · ${counts.all}` },
              { key: "mastered", dot: STATUS_COLORS.mastered, label: `${t("filter_dominadas", lang)} · ${counts.mastered}` },
              { key: "learning", dot: STATUS_COLORS.learning, label: `${t("filter_aprendiendo", lang)} · ${counts.learning}` },
              { key: "new", dot: STATUS_COLORS.new, label: `${t("filter_nuevas", lang)} · ${counts.new}` },
            ].map(f => (
              <button key={f.key} onClick={() => setMasteryFilter(f.key)} style={{
                minHeight: 34, padding: "6px 12px", borderRadius: 20, border: `1px solid ${masteryFilter === f.key ? "#FF9D3D" : "rgba(255,255,255,0.15)"}`,
                background: masteryFilter === f.key ? "rgba(255,157,61,0.15)" : "transparent",
                color: masteryFilter === f.key ? "#FF9D3D" : TEXT_2, fontSize: 12, cursor: "pointer", fontFamily: FONT_UI
              }}><Lbl gap={6}>{f.dot && <LevelDot color={f.dot} />}{f.label}</Lbl></button>
            ))}
          </div>

          {items.length === 0 && (
            <p style={{ color: TEXT_3, fontSize: 13, textAlign: "center", marginTop: 20 }}>
              {isVocab ? t("mastery_empty_select_vocab", lang) : t("mastery_empty_select_chars", lang)}
            </p>
          )}
          {items.length > 0 && filtered.length === 0 && (
            <p style={{ color: TEXT_3, fontSize: 13, textAlign: "center", marginTop: 20 }}>
              {t("mastery_empty_filter", lang)}
            </p>
          )}

          {filtered.map(item => (
            <div key={item.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 14px", marginBottom: 8,
              borderLeft: `4px solid ${STATUS_COLORS[item.status]}`
            }}>
              <div>
                <div style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{item.zh}</div>
                {item.py && <div style={{ color: TONE_COLORS_LIGHT[0], fontSize: 12, fontStyle: "italic" }}>{renderPinyinTone(item.py, false)}</div>}
                {item.text && <div style={{ color: "#aaa", fontSize: 12 }}>{item.text}</div>}
              </div>
              <span style={{ color: STATUS_COLORS[item.status], fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" }}><Lbl gap={6}><LevelDot color={STATUS_COLORS[item.status]} />{STATUS_LABELS[item.status]}</Lbl></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Modo: Escritura de trazos (sesión activa)
  if (mode === "writing") {
    if (!writeChar) return null;
    return (
      <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", fontFamily: FONT_UI }}>
        <div style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => setMode("menu")} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>{t("menu_back", lang)}</button>
            <span style={{ color: TEXT_2, fontSize: 13 }}>{writeIdx + 1} / {writeDeck.length}</span>
            <span style={{ color: "#C6501F", fontSize: 12, background: "rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: 20, fontWeight: "bold" }}>
              ✅ {writeStats.done}
            </span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 5, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(writeIdx / writeDeck.length) * 100}%`, background: "linear-gradient(90deg, #C6501F, #FF9D3D)", borderRadius: 4, transition: "width 0.4s" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: 280, height: 280, background: "#F7F1E8", borderRadius: 20, boxSizing: "border-box",
              border: `2px solid ${writeComplete ? "#4CAF50" : "#C6501F"}`, marginBottom: 16, padding: 10,
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <div ref={writeTargetRef} />
            </div>

            {writeShowPinyin && CHAR_PINYIN[writeChar] && (
              <p style={{ color: TEXT_2, fontSize: 18, fontStyle: "italic", marginBottom: 10, marginTop: -4 }}>
                {CHAR_PINYIN[writeChar]}
              </p>
            )}

            {writeComplete && (
              <p style={{ color: "#4CAF50", fontSize: 15, fontWeight: "bold", marginBottom: 12 }}>{t("completo", lang)}</p>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <SpeakButton text={writeChar} speak={speak} speaking={speaking}
                style={{ padding: "10px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", fontSize: 13 }} lang={lang} />
              <button onClick={() => {
                if (writeWriterRef.current) {
                  setWriteComplete(false);
                  writeWriterRef.current.quiz({
                    showHintAfterMisses: 2,
                    onComplete: () => {
                      setWriteComplete(true);
                      setWriteStats(prev => ({ done: prev.done + 1 }));
                      recordActivity(streak, setStreak);
                      setCharProgress(prev => {
                        const updated = { ...prev, [writeChar]: computeNextEntry(prev[writeChar], RATING.know) };
                        saveProgress(updated, CHAR_STORAGE_KEY);
                        return updated;
                      });
                    },
                  });
                }
              }} style={{
                padding: "10px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)", color: "#aaa", fontSize: 13, cursor: "pointer"
              }}>
                <Lbl icon="repeat" size={15} gap={6}>{noEmoji(t("reiniciar", lang))}</Lbl>
              </button>
              <button onClick={() => {
                if (writeWriterRef.current) writeWriterRef.current.animateCharacter();
              }} style={{
                padding: "10px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)", color: "#aaa", fontSize: 13, cursor: "pointer"
              }}>
                <Lbl icon="bulb" size={15} gap={6}>{noEmoji(t("pista", lang))}</Lbl>
              </button>
              <button onClick={() => setWriteShowPinyin(s => !s)} style={{
                padding: "10px 16px", borderRadius: 14, border: `1px solid ${writeShowPinyin ? "rgba(255,157,61,0.5)" : "rgba(255,255,255,0.2)"}`,
                background: writeShowPinyin ? "rgba(255,157,61,0.15)" : "rgba(255,255,255,0.06)",
                color: writeShowPinyin ? "#FF9D3D" : "#aaa", fontSize: 13, cursor: "pointer"
              }}>
                {t("pinyin_toggle", lang)}
              </button>
            </div>

            <button onClick={nextWriteChar} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
              background: writeComplete ? GRAD_PRIMARY : "rgba(255,255,255,0.08)",
              color: writeComplete ? "white" : "#888", fontSize: 14, fontWeight: "bold", cursor: "pointer"
            }}>
              {writeIdx + 1 >= writeDeck.length ? t("terminar", lang) : t("siguiente", lang)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modo: Sesión mixta (intercalada) — flashcard + escritura, tarjeta por tarjeta
  if (mode === "mixed") {
    if (!mixedCard) return null;
    return (
      <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", fontFamily: FONT_UI }}>
        <div style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => setMode("menu")} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>{t("menu_back", lang)}</button>
            <span style={{ color: TEXT_2, fontSize: 13 }}>{mixedIdx + 1} / {mixedQueue.length}</span>
            <span style={{ color: mixedColor.accent, fontSize: 12, background: "rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: 20, fontWeight: "bold" }}>
              {t("sesion_mixta_badge", lang)}
            </span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 5, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(mixedIdx / mixedQueue.length) * 100}%`, background: "linear-gradient(90deg, #7B1FA2, #BA68C8)", borderRadius: 4, transition: "width 0.4s" }} />
          </div>

          <div onClick={() => !mixedFlipped && setMixedFlipped(true)} style={{
            background: mixedFlipped ? mixedColor.bg : "rgba(255,255,255,0.05)",
            borderRadius: 24, padding: "32px 24px", minHeight: 260,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            cursor: mixedFlipped ? "default" : "pointer",
            borderTop: `2px solid ${mixedFlipped ? mixedColor.accent : "rgba(255,255,255,0.1)"}`,
            borderRight: `2px solid ${mixedFlipped ? mixedColor.accent : "rgba(255,255,255,0.1)"}`,
            borderBottom: `2px solid ${mixedFlipped ? mixedColor.accent : "rgba(255,255,255,0.1)"}`,
            borderLeft: `6px solid ${mixedColor.accent}`,
            transition: "all 0.35s ease",
          }}>
            {!mixedFlipped ? (
              <>
                <div style={{ fontSize: 22, color: "white", textAlign: "center", lineHeight: 1.4 }}>{cardText(mixedCard, "es", lang)}</div>
                <div style={{ marginTop: 16, color: TEXT_3, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>👆</span> {t("toca_revelar", lang)}
                </div>
              </>
            ) : (
              <>
                {mixedCard.emoji && <div style={{ fontSize: 34, marginBottom: 4 }}>{mixedCard.emoji}</div>}
                <div style={{ fontSize: 38, fontWeight: "bold", color: mixedColor.accent, marginBottom: 4, textAlign: "center" }}>{mixedCard.zh}</div>
                {showPinyin && <div style={{ fontSize: 15, marginBottom: 6, color: TONE_COLORS_LIGHT[0] }}>{renderPinyinTone(mixedCard.py, false)}</div>}
                <div style={{ fontSize: 18, color: "#333", marginBottom: 12, textAlign: "center" }}>{cardText(mixedCard, "es", lang)}</div>
                <SpeakButton text={mixedCard.zh} speak={speak} speaking={speaking} color={mixedColor.accent} variant="label" label={t("escuchar_de_nuevo", lang)} error={speechError} lang={lang} />
              </>
            )}
          </div>

          {mixedFlipped && (
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {[
                { key: "no_la_se", value: RATING.dontKnow, color: "#F44336", bg: "rgba(244,67,54,0.15)" },
                { key: "casi", value: RATING.almost, color: "#FF9D3D", bg: "rgba(255,157,61,0.15)" },
                { key: "la_se", value: RATING.know, color: "#4CAF50", bg: "rgba(76,175,80,0.15)" },
              ].map(btn => (
                <button key={btn.value} onClick={() => rateMixed(btn.value)} style={{
                  flex: 1, padding: "14px 4px", borderRadius: 14, border: `2px solid ${btn.color}66`,
                  background: btn.bg, color: btn.color, fontSize: 12, fontWeight: "bold", cursor: "pointer"
                }}>
                  {t(btn.key, lang)}
                </button>
              ))}
            </div>
          )}

          <p style={{ textAlign: "center", color: TEXT_3, fontSize: 11, marginTop: 20 }}>
            {t("mixed_hint", lang)}
          </p>
        </div>
      </div>
    );
  }

  // Modo: Construir frases
  if (mode === "build") {
    if (!buildCard) return null;
    const color2 = UNIT_COLORS[buildCard.unit] || UNIT_COLORS[1];
    const isHard = builderLevel === "hard";
    const isMedium = builderLevel === "medium";
    const resolved = isHard ? hardResult !== null : buildResult !== null;
    const wasCorrect = isHard ? hardResult === "correct" : buildResult === "correct";
    const wasWrong = isHard ? hardResult === "wrong" : buildResult === "wrong";
    const targetChars = Array.from(buildCard.zh);

    return (
      <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", fontFamily: FONT_UI }}>
        <div style={{ maxWidth: 480, width: "100%" }}>

          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => setMode("menu")} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>{t("menu_back", lang)}</button>
            <span style={{ color: TEXT_2, fontSize: 13 }}>{buildIdx + 1} / {buildDeck.length}</span>
            <span style={{ color: TEXT_2, fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: 20, fontWeight: "bold" }}>
              <Lbl gap={6}><LevelDot color={LEVEL_COLORS[builderLevel]} />{isHard ? "听写" : isMedium ? noEmoji(t("nivel_medio", lang)) : noEmoji(t("nivel_facil", lang))}</Lbl>
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 5, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(buildIdx / buildDeck.length) * 100}%`, background: "linear-gradient(90deg, #00838F, #4DD0E1)", borderRadius: 4, transition: "width 0.4s" }} />
          </div>

          {/* Prompt */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 18px", marginBottom: 16, textAlign: "center" }}>
            <p style={{ color: "#4DD0E1", fontSize: 11, margin: "0 0 8px 0", letterSpacing: 1 }}>
              {isHard ? t("escribe_frase", lang) : t("arma_frase", lang)}
            </p>
            <p style={{ color: "white", fontSize: 18, margin: 0, lineHeight: 1.4 }}>{cardText(buildCard, "es", lang)}</p>
          </div>

          {isHard ? (
            <>
              {/* Campo de escritura libre — 听写 */}
              <textarea
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); if (!resolved) checkHardAnswer(); } }}
                autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} lang="zh-CN" enterKeyHint="done"
                placeholder={t("dictado_placeholder", lang)}
                disabled={wasCorrect}
                style={{
                  width: "100%", minHeight: 60, background: "rgba(255,255,255,0.05)",
                  border: `2px solid ${wasCorrect ? "#4CAF50" : wasWrong ? "#F44336" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: 14, padding: 14, fontSize: 26, color: "white",
                  fontFamily: FONT_UI, resize: "none", marginBottom: 12, boxSizing: "border-box"
                }}
              />

              {wasCorrect && <p style={{ textAlign: "center", color: "#4CAF50", fontSize: 15, fontWeight: "bold", marginBottom: 12 }}>{t("correcto", lang)}</p>}
              {wasWrong && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ textAlign: "center", color: "#F44336", fontSize: 14, marginBottom: 8 }}>{t("no_coincide", lang)}</p>
                  <p style={{ textAlign: "center", fontSize: 26, letterSpacing: 2 }}>
                    {hardDiff.map((d, i) => (
                      <span key={i} style={{ color: d.ok ? "#66BB6A" : "#FF8A80" }}>{d.ch}</span>
                    ))}
                  </p>
                </div>
              )}

              {!wasCorrect && (
                <button onClick={checkHardAnswer} style={{
                  width: "100%", padding: "12px 0", borderRadius: 14, border: "none", marginBottom: 16,
                  background: GRAD_BUILD, color: "white", fontSize: 14, fontWeight: "bold", cursor: "pointer"
                }}>
                  {t("verificar", lang)}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Answer area */}
              <div style={{
                minHeight: 70, background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 14, marginBottom: 16,
                display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center",
                border: `2px solid ${wasCorrect ? "#4CAF50" : wasWrong ? "#F44336" : "rgba(255,255,255,0.15)"}`,
                transition: "border-color 0.3s"
              }}>
                {answer.length === 0 && <span style={{ color: TEXT_3, fontSize: 13 }}>{t("toca_fichas_orden", lang)}</span>}
                {answer.map((tile, i) => {
                  // Al fallar, marca cada ficha ya colocada según si quedó en la
                  // posición correcta — así se ve exactamente cuál mover, en vez
                  // de solo un mensaje genérico de error.
                  const posOk = targetChars[i] === tile.ch;
                  return (
                    <button key={tile.uid} onClick={() => tapAnswerTile(tile)} style={{
                      fontSize: 26, padding: "8px 14px", borderRadius: 10,
                      border: wasWrong ? `2px solid ${posOk ? "#4CAF50" : "#F44336"}` : "none",
                      background: wasCorrect ? "rgba(76,175,80,0.25)" : wasWrong ? (posOk ? "rgba(76,175,80,0.15)" : "rgba(244,67,54,0.25)") : "rgba(77,208,225,0.15)",
                      color: wasCorrect ? "#4CAF50" : wasWrong ? (posOk ? "#4CAF50" : "#F44336") : "#4DD0E1",
                      cursor: wasCorrect ? "default" : "pointer", fontFamily: FONT_UI
                    }} disabled={wasCorrect}>
                      {tile.ch}
                    </button>
                  );
                })}
              </div>

              {/* Feedback message */}
              {wasCorrect && (
                <p style={{ textAlign: "center", color: "#4CAF50", fontSize: 15, fontWeight: "bold", marginBottom: 12 }}>{t("correcto", lang)}</p>
              )}
              {wasWrong && (
                <p style={{ textAlign: "center", color: "#F44336", fontSize: 14, marginBottom: 12 }}>
                  {isMedium ? t("revisa_ficha_de_mas", lang) : t("casi_revisa_orden", lang)}
                </p>
              )}

              {/* Tile pool */}
              <div style={{
                minHeight: 70, borderRadius: 16, padding: 14, marginBottom: isMedium ? 8 : 16,
                display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center"
              }}>
                {pool.map(tile => (
                  <button key={tile.uid} onClick={() => tapPoolTile(tile)} style={{
                    fontSize: 26, padding: "8px 14px", borderRadius: 10,
                    border: `2px solid ${color2.accent}66`, background: color2.bg,
                    color: "#12151C", cursor: "pointer", fontFamily: FONT_UI, fontWeight: "bold"
                  }}>
                    {tile.ch}
                  </button>
                ))}
              </div>

              {isMedium && !wasCorrect && (
                <button onClick={checkMediumAnswer} disabled={answer.length === 0} style={{
                  width: "100%", padding: "12px 0", borderRadius: 14, border: "none", marginBottom: 16,
                  background: answer.length === 0 ? "#444" : GRAD_BUILD,
                  color: "white", fontSize: 14, fontWeight: "bold", cursor: answer.length === 0 ? "not-allowed" : "pointer"
                }}>
                  {t("verificar", lang)}
                </button>
              )}
            </>
          )}

          {/* Answer reveal */}
          {showBuildAnswer && (
            <div style={{ background: `${color2.accent}15`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
              <p style={{ fontSize: 22, color: color2.accent, fontWeight: "bold", margin: "0 0 4px 0" }}>{buildCard.zh}</p>
              {showPinyin && <p style={{ fontSize: 14, margin: "0 0 4px 0", fontStyle: "italic", color: TONE_COLORS_DARK[0] }}>{renderPinyinTone(buildCard.py, true)}</p>}
              <p style={{ fontSize: 13, color: "#ccc", margin: 0 }}>{cardText(buildCard, "es", lang)}</p>
            </div>
          )}

          {/* Bottom actions */}
          <div style={{ display: "flex", gap: 8 }}>
            {buildIdx > 0 && (
              <button onClick={prevBuildCard} style={{
                padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)", color: "#aaa", fontSize: 13, cursor: "pointer"
              }}>
                {t("anterior", lang)}
              </button>
            )}
            <SpeakButton text={buildCard.zh} speak={speak} speaking={speaking}
              style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", fontSize: 13 }} lang={lang} />
            {!showBuildAnswer && !resolved ? (
              <button onClick={() => setShowBuildAnswer(true)} style={{
                flex: 1, padding: "12px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)", color: "#aaa", fontSize: 13, cursor: "pointer"
              }}>
                <Lbl icon="eye" size={16}>{noEmoji(t("ver_respuesta", lang))}</Lbl>
              </button>
            ) : (
              <button onClick={nextBuildCard} style={{
                flex: 1, padding: "12px 0", borderRadius: 14, border: "none",
                background: GRAD_BUILD, color: "white", fontSize: 14, fontWeight: "bold", cursor: "pointer"
              }}>
                {t("siguiente", lang)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Study mode
  if (!card) return null;
  return (
    <div style={{ minHeight: "100vh", background: SCREEN_BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 480, width: "100%" }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => setMode("menu")} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>{t("menu_back", lang)}</button>
          <span style={{ color: TEXT_2, fontSize: 13 }}>{currentIdx + 1} / {deck.length}</span>
          <span style={{ color: TEXT_2, fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: 20, fontWeight: "bold" }}>
            <Lbl gap={6}><LevelDot color={color.light || color.accent} />{card.unit <= 10 || card.unit === 30 ? displayUnitName(card, lang) : (() => { const b = bookInfo(card.unit); return b ? `L${b.book} · U${b.num}` : displayUnitName(card, lang); })()}</Lbl>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 5, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((currentIdx) / deck.length) * 100}%`, background: "linear-gradient(90deg, #FF6B35, #FF9D3D)", borderRadius: 4, transition: "width 0.4s" }} />
        </div>

        {/* Card */}
        <div
          onClick={() => { if (!flipped) { haptic(8); setFlipped(true); } }}
          onPointerDown={onCardPointerDown}
          onPointerMove={onCardPointerMove}
          onPointerUp={onCardPointerUp}
          onPointerCancel={onCardPointerUp}
          style={{
            position: "relative",
            background: flipped ? color.bg : "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
            borderRadius: 24, padding: "32px 24px", minHeight: 260,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            cursor: flipped ? (dragging ? "grabbing" : "grab") : "pointer",
            touchAction: "pan-y",
            borderTop: `1px solid ${flipped ? color.accent + "88" : "rgba(255,255,255,0.12)"}`,
            borderRight: `1px solid ${flipped ? color.accent + "88" : "rgba(255,255,255,0.12)"}`,
            borderBottom: `1px solid ${flipped ? color.accent + "88" : "rgba(255,255,255,0.12)"}`,
            borderLeft: `6px solid ${color.accent}`,
            transition: dragging ? "none" : "transform 0.3s ease, opacity 0.3s ease, background 0.35s ease, box-shadow 0.35s ease",
            boxShadow: flipped ? `0 12px 36px ${color.accent}40` : "0 10px 30px rgba(0,0,0,0.35)",
            opacity: animating ? 0 : 1,
            transform: `translateX(${dragX}px) rotate(${dragX / 20}deg) scale(${animating ? 0.95 : 1})`
          }}>
          {flipped && dragX !== 0 && (
            <span style={{
              position: "absolute", top: 14, [dragX > 0 ? "right" : "left"]: 14,
              fontSize: 13, fontWeight: "bold", fontFamily: FONT_UI,
              color: dragX > 0 ? "#2E7D32" : "#C62828",
              opacity: Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1),
              pointerEvents: "none"
            }}>
              {dragX > 0 ? t("la_se", lang) : t("no_la_se", lang)}
            </span>
          )}
          {!flipped ? (
            <div key={`f${card.id}`} className="gwc-face">
              {isReference && (
                <span style={{
                  background: `${color.accent}22`, border: `1px solid ${color.accent}55`, color: color.accent,
                  borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: "bold", marginBottom: 14
                }}>
                  {t("ficha_referencia", lang)}
                </span>
              )}
              {studyDir === "zh→es" && (
                <>
                  <div style={{ fontSize: 42, fontWeight: "bold", color: "white", marginBottom: 12, textAlign: "center" }}>{card.zh}</div>
                  <SpeakButton text={card.zh} speak={speak} speaking={speaking} variant="front" error={speechError} lang={lang} />
                  <FrontPinyinReveal pinyin={card.py} cardId={card.id} showPinyin={showPinyin} lang={lang} />
                </>
              )}
              {studyDir === "es→zh" && (
                <div style={{ fontSize: 22, color: "white", textAlign: "center", lineHeight: 1.4 }}>{cardText(card, "es", lang)}</div>
              )}
              {studyDir === "listen" && (
                isSpeakableZh(card.zh) ? (
                  <>
                    <div style={{ fontSize: 52, marginBottom: 10 }}>🔊</div>
                    <SpeakButton text={card.zh} speak={speak} speaking={speaking} variant="front" label={t("escuchar_de_nuevo", lang)} error={speechError} lang={lang} />
                    <p style={{ color: TEXT_3, fontSize: 12, textAlign: "center", margin: 0 }}>{t("listen_hint", lang)}</p>
                  </>
                ) : (
                  <p style={{ color: TEXT_3, fontSize: 13, textAlign: "center", margin: 0 }}>{t("sin_audio", lang)}</p>
                )
              )}
              <div style={{ marginTop: 16, color: TEXT_3, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span>👆</span> {isReference ? t("toca_revelar_referencia", lang) : t("toca_revelar", lang)}
              </div>
            </div>
          ) : (
            <div key={`b${card.id}`} className="gwc-face">
              {card.emoji && <div style={{ fontSize: 34, marginBottom: 4 }}>{card.emoji}</div>}
              <div style={{ fontSize: 38, fontWeight: "bold", color: color.accent, marginBottom: 4, textAlign: "center" }}>{back_zh}</div>
              {showPinyin && <div style={{ fontSize: 15, marginBottom: 6, color: TONE_COLORS_LIGHT[0] }}>{renderPinyinTone(back_py, false)}</div>}
              <div style={{ fontSize: 18, color: "#333", marginBottom: 12, textAlign: "center" }}>{back_es}</div>

              {/* Speaker button on back */}
              <SpeakButton text={card.zh} speak={speak} speaking={speaking} color={color.accent} variant="label" label={t("escuchar_de_nuevo", lang)} error={speechError} lang={lang} />

              {lastDeckKind === "vocab" ? (
                <ExampleBox card={card} color={color} speak={speak} speaking={speaking} showPinyin={showPinyin} lang={lang} />
              ) : (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setShowExample(s => !s); }} style={{
                    background: "none", border: `1px solid ${color.accent}44`, borderRadius: 20, padding: "6px 14px",
                    color: color.accent, fontSize: 12, cursor: "pointer"
                  }}>
                    {showExample ? t("ocultar_ejemplo", lang) : t("ver_ejemplo", lang)}
                  </button>

                  {showExample && <ExampleBox card={card} color={color} speak={speak} speaking={speaking} showPinyin={showPinyin} lang={lang} />}
                </>
              )}
            </div>
          )}
        </div>

        {/* Rating buttons */}
        {flipped && (
          <p style={{ textAlign: "center", color: TEXT_3, fontSize: 11, margin: "14px 0 0 0", fontFamily: FONT_UI }}>
            {t("swipe_hint", lang)}
          </p>
        )}
        {flipped && (
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {currentIdx > 0 && (
              <button onClick={prevCard} style={{
                padding: "14px 10px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)", color: "#aaa", fontSize: 12, cursor: "pointer"
              }}>
                {t("anterior", lang)}
              </button>
            )}
            {[
              { key: "no_la_se", value: RATING.dontKnow, color: "#F44336", bg: "rgba(244,67,54,0.15)" },
              { key: "casi", value: RATING.almost, color: "#FF9D3D", bg: "rgba(255,157,61,0.15)" },
              { key: "la_se", value: RATING.know, color: "#4CAF50", bg: "rgba(76,175,80,0.15)" },
            ].map(btn => (
              <button key={btn.value} onClick={() => rate(btn.value)} style={{
                flex: 1, minHeight: 56, padding: "14px 4px", borderRadius: 16, border: `2px solid ${btn.color}66`,
                background: btn.bg, color: btn.color, fontSize: 13, fontWeight: "bold",
                cursor: "pointer", transition: "transform 0.1s"
              }}>
                {t(btn.key, lang)}
              </button>
            ))}
          </div>
        )}

        {!flipped && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {currentIdx > 0 && (
              <button onClick={prevCard} style={{
                padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)", color: "#aaa", fontSize: 13, cursor: "pointer"
              }}>
                {t("anterior", lang)}
              </button>
            )}
            <button onClick={() => { haptic(8); setFlipped(true); }} style={{
              flex: 1, minHeight: 52, padding: "14px 0", borderRadius: 14, border: "2px solid rgba(255,107,53,0.4)",
              background: "rgba(255,107,53,0.1)", color: "#FF9D3D", fontSize: 14, fontWeight: "bold", cursor: "pointer"
            }}>
              <Lbl icon={isReference ? "vocab" : "eye"} size={17}>{isReference ? t("ver_explicacion", lang) : t("revelar", lang)}</Lbl>
            </button>
          </div>
        )}

        {/* Mini stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 20, fontSize: 12, color: TEXT_3 }}>
          <span style={{ color: "#4CAF50" }}>✅ {knowCount}</span>
          <span style={{ color: "#FF9D3D" }}>🤔 {almostCount}</span>
          <span style={{ color: "#F44336" }}>❌ {dontCount}</span>
        </div>
      </div>
    </div>
  );
}
