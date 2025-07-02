const API_URL = 'https://opentdb.com/api.php';
const CAT_URL = 'https://opentdb.com/api_category.php';

// --- Estado global del juego ---
const state = {
  player: '',
  count: 5,
  difficulty: 'easy',
  category: '',
  questions: [],
  currentIndex: 0,
  score: 0,
  correct: 0,
  times: []
};

// --- Elementos del DOM ---
const elements = {
  configSection: document.getElementById('config'),
  gameSection: document.getElementById('game'),
  resultsSection: document.getElementById('results'),
  configForm: document.getElementById('config-form'),
  playerInput: document.getElementById('player-name'),
  countInput: document.getElementById('question-count'),
  diffSelect: document.getElementById('difficulty'),
  catSelect: document.getElementById('category'),
  loader: document.getElementById('loader'),
  questionContainer: document.getElementById('question-container'),
  questionText: document.getElementById('question-text'),
  answersGrid: document.getElementById('answers'),
  progressEl: document.getElementById('current'),
  totalEl: document.getElementById('total'),
  timerEl: document.getElementById('timer'),
  playerDisplay: document.getElementById('player-display'),
  scoreDisplay: document.getElementById('score-display'),
  correctDisplay: document.getElementById('correct-display'),
  totalDisplay: document.getElementById('total-display'),
  percentDisplay: document.getElementById('percent-display'),
  avgtimeDisplay: document.getElementById('avgtime-display'),
  restartSame: document.getElementById('restart-same'),
  restartNew: document.getElementById('restart-new')
};

let timerId, startTime;

// Arranca todo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  fetchCategories();                                 // 1) Traer categorías de la API
  elements.configForm.addEventListener('submit', onStart);
  elements.restartSame.addEventListener('click', restartSameGame);
  elements.restartNew.addEventListener('click', restartNewConfig);
});

async function fetchCategories() {
  try {
    const res = await fetch(CAT_URL);
    const data = await res.json();
    data.trivia_categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      elements.catSelect.appendChild(opt);
    });
  } catch (err) {
    console.warn('No se pudieron cargar categorías', err);
  }
}

function onStart(event) {
  event.preventDefault();
  // Leer configuración
  state.player = elements.playerInput.value.trim();
  state.count = +elements.countInput.value;
  state.difficulty = elements.diffSelect.value;
  state.category = elements.catSelect.value;
  // Validar mínimo 2 caracteres en nombre
  if (state.player.length < 2) {
    alert('Pon un nombre de jugador con al menos 2 caracteres.');
    return;
  }
  startGame();
}

async function startGame() {
  toggleSection(elements.configSection, elements.gameSection);
  showLoader(true);

  const url = new URL(API_URL);
  url.searchParams.set('amount', state.count);
  url.searchParams.set('difficulty', state.difficulty);
  url.searchParams.set('type', 'multiple');
  if (state.category) url.searchParams.set('category', state.category);

  try {
    const res = await fetch(url);
    const data = await res.json();
    state.questions = data.results;
    elements.totalEl.textContent = state.count;
    showLoader(false);
    showQuestion();
  } catch (err) {
    alert('Error cargando preguntas. Revisa tu conexión.');
    console.error(err);
  }
}

function showLoader(flag) {
  elements.loader.classList.toggle('hidden', !flag);
  elements.questionContainer.classList.toggle('hidden', flag);
}

function showQuestion() {
  resetTimer();
  const q = state.questions[state.currentIndex];
  elements.questionText.innerHTML = decodeHTML(q.question);

  // Mezclar y mostrar opciones
  const options = [...q.incorrect_answers, q.correct_answer]
    .sort(() => Math.random() - .5);

  elements.answersGrid.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.innerHTML = decodeHTML(opt);
    btn.addEventListener('click', () => selectAnswer(btn, q.correct_answer));
    elements.answersGrid.appendChild(btn);
  });

  elements.progressEl.textContent = state.currentIndex + 1;
  startTimer();
}

function startTimer() {
  let time = 20;
  elements.timerEl.textContent = time;
  startTime = Date.now();
  timerId = setInterval(() => {
    time--;
    elements.timerEl.textContent = time;
    if (time <= 5) elements.timerEl.classList.add('warning');
    if (time === 0) {
      clearInterval(timerId);
      recordTime(20);
      autoNext();
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerId);
  elements.timerEl.classList.remove('warning');
}

function selectAnswer(button, correctAnswer) {
  clearInterval(timerId);
  const chosen = button.innerHTML;
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  recordTime(elapsed);

  // Feedback visual
  if (chosen === decodeHTML(correctAnswer)) {
    state.score += 10;
    state.correct++;
    button.classList.add('correct');
  } else {
    button.classList.add('incorrect');
    // Marcar la respuesta correcta
    Array.from(elements.answersGrid.children)
      .find(b => b.innerHTML === decodeHTML(correctAnswer))
      ?.classList.add('correct');
  }

  // Bloquear más clicks
  Array.from(elements.answersGrid.children)
    .forEach(b => b.disabled = true);

  setTimeout(autoNext, 1000);
}
function autoNext() {
  state.currentIndex++;
  if (state.currentIndex < state.count) showQuestion();
  else showResults();
}

function recordTime(sec) {
  state.times.push(sec);
}

function showResults() {
  toggleSection(elements.gameSection, elements.resultsSection);

  elements.playerDisplay.textContent = state.player;
  elements.scoreDisplay.textContent = state.score;
  elements.correctDisplay.textContent = state.correct;
  elements.totalDisplay.textContent = state.count;
  elements.percentDisplay.textContent = Math.round(state.correct / state.count * 100);
  const avg = (state.times.reduce((a, b) => a + b, 0) / state.times.length).toFixed(1);
  elements.avgtimeDisplay.textContent = avg;
}

function restartSameGame() {
  // Resetea sin cambiar configuración
  state.currentIndex = 0;
  state.score = 0;
  state.correct = 0;
  state.times = [];
  toggleSection(elements.resultsSection, elements.gameSection);
  showQuestion();
}

function restartNewConfig() {
  // Vuelve al formulario
  state.currentIndex = 0;
  state.score = 0;
  state.correct = 0;
  state.times = [];
  toggleSection(elements.resultsSection, elements.configSection);
}

function toggleSection(hideEl, showEl) {
  hideEl.classList.add('hidden');
  showEl.classList.remove('hidden');
}

function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}
