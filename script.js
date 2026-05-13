// 1. Liste aqui os nomes dos arquivos dos seus slides na ordem certa
const slideFiles = [
    'slides/01.html',
    'slides/02.html',
    'slides/03.html',
    'slides/04.html',
    'slides/05.html',
    'slides/06.html',
    'slides/07.html',
    'slides/08.html',
    'slides/09.html',
    'slides/10.html',
    'slides/11.html',
    'slides/12.html',
    'slides/13.html',
    'slides/14.html',
    'slides/15.html',
    'slides/16.html',
    'slides/17.html',
    'slides/18.html',
    'slides/19.html',
    'slides/20.html',
    'slides/21.html',
    'slides/22.html',
    'slides/23.html',
    'slides/27.html',
    'slides/28.html',
    'slides/31.html',
    'slides/36.html',
    'slides/38.html',
    'slides/29.html',
    'slides/30.html',
    'slides/37.html',
    'slides/35.html',
  ];

// Variáveis globais que serão preenchidas após carregar os slides
let slides = [];
const bar = document.getElementById('bar');
const counter = document.getElementById('counter');
const notes = document.getElementById('notes');
const noteText = document.getElementById('noteText');
const slideJump = document.getElementById('slideJump');

let index = 0;
let lastIndex = 0;
const slideStageProgress = new Map();
const shoalScenes = [];
let shoalAnimationFrame = null;
const experimentScenes = [];
let experimentAnimationFrame = null;
const dualFishScenes = [];
let dualFishAnimationFrame = null;
const gwpeLensScenes = [];
let gwpeLensAnimationFrame = null;
const entropyTimelineSlides = [];
const slideFragmentProgress = new Map();
let mathTypesetRetryId = null;
const deckAssetVersion = '20260512-references-after-schedule';

// 2. Função que busca os arquivos HTML e os insere na página
async function loadSlides() {
  const deck = document.getElementById('deck');
  
  for (const file of slideFiles) {
    try {
      const response = await fetch(`${file}?v=${deckAssetVersion}`);
      const html = await response.text();
      deck.insertAdjacentHTML('beforeend', html);
    } catch (error) {
      console.error(`Erro ao carregar o slide ${file}:`, error);
    }
  }

  // Depois que todos carregarem, inicializa a apresentação
  initPresentation();
}

// 3. Inicializa a lógica original
function initPresentation() {
    slides = [...document.querySelectorAll('.slide')];
    initSlideJump();
    initSlideStages();
    initSlideFragments();
    initShoalCanvases();
    initExperimentScenes();
  initDualFishScenes();
  initGwpeLensScenes();
  initEntropyTimelines();
    scheduleMathTypeset();
    render(); // Chama o render para mostrar o primeiro slide
  }

function scheduleMathTypeset() {
  const deck = document.getElementById('deck');
  if (!deck) return;

  const tryTypeset = () => {
    const mathJax = window.MathJax;
    if (!mathJax?.typesetPromise) return false;

    if (mathTypesetRetryId) {
      window.clearTimeout(mathTypesetRetryId);
      mathTypesetRetryId = null;
    }

    const startup = mathJax.startup?.promise || Promise.resolve();
    startup
      .then(() => {
        if (typeof mathJax.typesetClear === 'function') {
          mathJax.typesetClear([deck]);
        }
        return mathJax.typesetPromise([deck]);
      })
      .catch(() => {});
    return true;
  };

  if (tryTypeset()) return;

  if (mathTypesetRetryId) {
    window.clearTimeout(mathTypesetRetryId);
  }

  mathTypesetRetryId = window.setTimeout(() => {
    scheduleMathTypeset();
  }, 120);
}

function initSlideStages() {
  slides.forEach((slide) => {
    slideStageProgress.set(slide, 0);
    syncSlideStage(slide);
  });
}

function initSlideFragments() {
  slides.forEach((slide) => {
    slideFragmentProgress.set(slide, 0);
    getSlideFragments(slide).forEach((fragment) => {
      fragment.classList.remove('is-visible');
    });
  });
}

function render() {
  slides.forEach((slide, i) => {
    slide.classList.remove('active', 'exit-left');

    if (i === index) {
      slide.classList.add('active');
    }

    if (i === lastIndex && lastIndex !== index && lastIndex < index) {
      slide.classList.add('exit-left');
    }
  });

  syncSlideStage(slides[index]);
  syncSlideFragments(slides[index]);
  handleExperimentResize();
  syncSimRealVideoPlayback();
  syncGwpeLensPlayback();
  syncTeResultVideoPlayback();

  bar.style.width = `${((index + 1) / slides.length) * 100}%`;
  counter.textContent = `${index + 1} / ${slides.length}`;
  if (slideJump) slideJump.value = String(index);
  noteText.textContent = slides[index]?.dataset.note || '';
}

function initSlideJump() {
  if (!slideJump) return;

  slideJump.innerHTML = '';
  slides.forEach((_, slideIndex) => {
    const option = document.createElement('option');
    option.value = String(slideIndex);
    option.textContent = `${slideIndex + 1}`;
    slideJump.appendChild(option);
  });

  slideJump.addEventListener('change', () => {
    const nextIndex = Number.parseInt(slideJump.value || '0', 10);
    goToSlide(nextIndex);
  });
}

function nextSlide() {
  if (advanceSlideStage(slides[index])) {
    return;
  }

  if (revealNextFragment(slides[index])) {
    return;
  }

  if (index < slides.length - 1) {
    lastIndex = index;
    index += 1;
    render();
  }
}

function prevSlide() {
  if (index > 0) {
    resetSlideStage(slides[index]);
    resetSlideFragments(slides[index]);
    lastIndex = index;
    index -= 1;
    render();
  }
}

function goToSlide(nextIndex) {
  if (!Number.isInteger(nextIndex)) return;
  if (nextIndex < 0 || nextIndex >= slides.length || nextIndex === index) return;

  resetSlideStage(slides[index]);
  resetSlideFragments(slides[index]);
  lastIndex = index;
  index = nextIndex;
  render();
}

function getSlideStageTotal(slide) {
  if (!slide) return 0;
  return Number.parseInt(slide.dataset.stageCount || '0', 10);
}

function syncSlideStage(slide) {
  if (!slide) return;
  const stage = slideStageProgress.get(slide) || 0;
  slide.dataset.stage = String(stage);
  slide.classList.toggle('stage-topics', stage >= 1);
  slide.classList.toggle('stage-next', stage >= 2);
  syncEntropyTimeline(slide, stage);
  handleExperimentResize();
  syncDualFishStages();
  syncSimRealVideoPlayback();
  syncGwpeLensPlayback();
  syncTeResultVideoPlayback();
}

function syncSimRealVideoPlayback() {
  const simRealSlides = [...document.querySelectorAll('.sim-real-slide')];
  simRealSlides.forEach((slide) => {
    const video = slide.querySelector('.sim-real-slide__video-element');
    if (!video) return;

    const stage = slideStageProgress.get(slide) || 0;
    const shouldPlay = slide.classList.contains('active') && stage >= 3;

    if (shouldPlay) {
      const playAttempt = video.play();
      if (playAttempt?.catch) {
        playAttempt.catch(() => {});
      }
      return;
    }

    video.pause();
    if (!slide.classList.contains('active')) {
      video.currentTime = 0;
    }
  });
}

function syncTeResultVideoPlayback() {
  document.querySelectorAll('.te-ji-results-slide__figure-video').forEach((video) => {
    const slide = video.closest('.slide');
    const playStage = video.dataset.playStage || '2';
    const shouldPlay = slide?.classList.contains('active') && slide.dataset.stage === playStage;

    if (shouldPlay) {
      const playAttempt = video.play();
      if (playAttempt?.catch) {
        playAttempt.catch(() => {});
      }
      return;
    }

    video.pause();
    if (!slide?.classList.contains('active')) {
      video.currentTime = 0;
    }
  });
}

function initGwpeLensScenes() {
  gwpeLensScenes.length = 0;

  const roots = [...document.querySelectorAll('.gwpe-bridge-slide__lens')];
  roots.forEach((root) => {
    const svg = root.querySelector('.gwpe-bridge-slide__lens-svg');
    const baseLine = root.querySelector('.gwpe-bridge-slide__lens-base');
    const segmentsGroup = root.querySelector('.gwpe-bridge-slide__lens-segments');
    const pointsGroup = root.querySelector('.gwpe-bridge-slide__lens-points');
    const weightsBox = root.querySelector('.gwpe-bridge-slide__lens-weights');
    const knob = root.querySelector('.gwpe-bridge-slide__lens-knob');
    if (!svg || !baseLine || !segmentsGroup || !pointsGroup || !weightsBox || !knob) {
      return;
    }

    const total = 40;
    const points = [];

    for (let i = 0; i < total; i += 1) {
      const x = 55 + i * 25;
      const y =
        195
        - 45 * Math.sin(i * 0.35)
        - 28 * Math.sin(i * 0.95)
        - 22 * Math.cos(i * 1.55)
        + 12 * Math.sin(i * 2.4);
      points.push({ x, y });
    }

    const path = (arr) => arr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const variance = (values) => {
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    };

    baseLine.setAttribute('d', path(points));

    points.forEach((point) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', '3.8');
      circle.setAttribute('class', 'gwpe-bridge-slide__lens-point');
      pointsGroup.appendChild(circle);
    });

    const windows = [];
    for (let i = 0; i <= points.length - 3; i += 1) {
      const trio = points.slice(i, i + 3);
      const ys = trio.map((point) => point.y);
      const localVariance = variance(ys);

      const segment = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      segment.setAttribute('d', path(trio));
      segment.setAttribute('class', 'gwpe-bridge-slide__lens-segment');
      segmentsGroup.appendChild(segment);

      windows.push({ segment, variance: localVariance });
    }

    const variances = windows.map((windowItem) => windowItem.variance);
    const minVar = Math.min(...variances);
    const maxVar = Math.max(...variances);

    windows.forEach((windowItem) => {
      const norm = (windowItem.variance - minVar) / (maxVar - minVar || 1);
      windowItem.level = Math.min(7, Math.floor(norm * 8));
    });

    const levelNames = [
      'variância muito baixa',
      'variância baixa',
      'variância leve',
      'variância moderada',
      'variância intermediária',
      'variância alta',
      'variância muito alta',
      'variância extrema',
    ];

    const rows = [];
    levelNames.forEach((name) => {
      const row = document.createElement('div');
      row.className = 'gwpe-bridge-slide__lens-weight-row';
      row.innerHTML = `
        <div>${name}</div>
        <div class="gwpe-bridge-slide__lens-bar-bg">
          <div class="gwpe-bridge-slide__lens-bar"></div>
        </div>
        <div class="gwpe-bridge-slide__lens-value">0%</div>
      `;
      weightsBox.appendChild(row);

      rows.push({
        bar: row.querySelector('.gwpe-bridge-slide__lens-bar'),
        value: row.querySelector('.gwpe-bridge-slide__lens-value'),
      });
    });

    gwpeLensScenes.push({
      root,
      knob,
      windows,
      rows,
      levelNames,
      t: Math.random() * Math.PI * 2,
    });
  });
}

function syncGwpeLensPlayback() {
  const hasActiveScene = gwpeLensScenes.some((scene) => {
    const slide = scene.root.closest('.gwpe-bridge-slide');
    return slide?.classList.contains('active') && slide.dataset.stage === '0';
  });

  if (hasActiveScene && !gwpeLensAnimationFrame) {
    animateGwpeLensScenes();
    return;
  }

  if (!hasActiveScene && gwpeLensAnimationFrame) {
    window.cancelAnimationFrame(gwpeLensAnimationFrame);
    gwpeLensAnimationFrame = null;
  }
}

function animateGwpeLensScenes() {
  const activeScenes = gwpeLensScenes.filter((scene) => {
    const slide = scene.root.closest('.gwpe-bridge-slide');
    return slide?.classList.contains('active') && slide.dataset.stage === '0';
  });

  if (!activeScenes.length) {
    gwpeLensAnimationFrame = null;
    return;
  }

  activeScenes.forEach((scene) => {
    scene.t += 0.0018;
    const focus = (Math.sin(scene.t) + 1) / 2;
    scene.knob.style.left = `${focus * 100}%`;

    const focusLevel = focus * 7;
    const classWeights = scene.levelNames.map((_, i) => {
      const distance = Math.abs(i - focusLevel);
      return Math.max(0, 100 - distance * 13.5);
    });

    scene.windows.forEach((windowItem) => {
      const weight = classWeights[windowItem.level];
      const intensity = weight / 100;
      const alpha = 0.06 + intensity * 0.94;
      const blur = 1 + intensity * 16;
      const width = 4 + intensity * 8;

      windowItem.segment.style.stroke = `rgba(56,189,248,${alpha})`;
      windowItem.segment.style.strokeWidth = `${width}`;
      windowItem.segment.style.filter = `drop-shadow(0 0 ${blur}px rgba(56,189,248,${alpha}))`;
    });

    scene.rows.forEach((row, i) => {
      const weight = classWeights[i];
      row.bar.style.width = `${weight}%`;
      row.value.textContent = `${Math.round(weight)}%`;
      row.bar.classList.toggle('is-active', Math.round(focusLevel) === i);
      row.bar.style.opacity = 0.35 + (weight / 100) * 0.65;
    });

  });

  gwpeLensAnimationFrame = window.requestAnimationFrame(animateGwpeLensScenes);
}

function advanceSlideStage(slide) {
  const totalStages = getSlideStageTotal(slide);
  if (!totalStages) return false;

  const currentStage = slideStageProgress.get(slide) || 0;
  if (currentStage >= totalStages) return false;

  slideStageProgress.set(slide, currentStage + 1);
  syncSlideStage(slide);
  return true;
}

function resetSlideStage(slide) {
  if (!slide) return;
  if (!getSlideStageTotal(slide)) return;
  slideStageProgress.set(slide, 0);
  syncSlideStage(slide);
}

function initEntropyTimelines() {
  entropyTimelineSlides.length = 0;
  const timelineSlides = [...document.querySelectorAll('.entropy-timeline-slide')];
  timelineSlides.forEach((slide) => {
    entropyTimelineSlides.push(slide);
    syncEntropyTimeline(slide, 0);
  });

  if (!window.__entropyTimelineResizeBound) {
    window.addEventListener('resize', () => {
      entropyTimelineSlides.forEach((slide) => {
        const stage = slideStageProgress.get(slide) || 0;
        syncEntropyTimeline(slide, stage);
      });
    }, { passive: true });
    window.__entropyTimelineResizeBound = true;
  }
}

function syncEntropyTimeline(slide, stage) {
  if (!slide?.classList.contains('entropy-timeline-slide')) return;

  const items = [...slide.querySelectorAll('.entropy-timeline-slide__item')];
  const areaEl = slide.querySelector('.entropy-timeline-slide__area');
  const yearEl = slide.querySelector('.entropy-timeline-slide__year');
  const titleEl = slide.querySelector('.entropy-timeline-slide__title');
  const conceptEl = slide.querySelector('.entropy-timeline-slide__concept');
  const rail = slide.querySelector('.entropy-timeline-slide__rail');
  const viewport = slide.querySelector('.entropy-timeline-slide__viewport');
  if (!items.length || !conceptEl || !rail || !viewport) return;

  const activeIndex = Math.min(stage, items.length - 1);
  const activeItem = items[activeIndex];

  items.forEach((item, itemIndex) => {
    item.classList.toggle('is-active', itemIndex === activeIndex);
    item.setAttribute('aria-current', itemIndex === activeIndex ? 'step' : 'false');
  });

  if (areaEl) areaEl.textContent = activeItem.dataset.area || '';
  if (yearEl) yearEl.textContent = activeItem.dataset.year || '';
  if (titleEl) titleEl.textContent = activeItem.dataset.title || '';
  conceptEl.textContent = activeItem.dataset.concept || '';

  const itemCenter = activeItem.offsetLeft + activeItem.offsetWidth / 2;
  const viewportCenter = viewport.clientWidth / 2;
  const minTranslate = viewport.clientWidth - rail.scrollWidth;
  const translate = Math.max(minTranslate, Math.min(0, viewportCenter - itemCenter));
  rail.style.transform = `translateX(${translate}px)`;
}

function getSlideFragments(slide) {
  if (!slide) return [];
  return [...slide.querySelectorAll('.slide-fragment')];
}

function syncSlideFragments(slide) {
  const fragments = getSlideFragments(slide);
  const visibleCount = slideFragmentProgress.get(slide) || 0;

  fragments.forEach((fragment, fragmentIndex) => {
    fragment.classList.toggle('is-visible', fragmentIndex < visibleCount);
  });
}

function revealNextFragment(slide) {
  const fragments = getSlideFragments(slide);
  if (!fragments.length) return false;

  const visibleCount = slideFragmentProgress.get(slide) || 0;
  if (visibleCount >= fragments.length) return false;

  slideFragmentProgress.set(slide, visibleCount + 1);
  syncSlideFragments(slide);
  return true;
}

function resetSlideFragments(slide) {
  if (!slide) return;
  slideFragmentProgress.set(slide, 0);
  syncSlideFragments(slide);
}

function toggleNotes() {
  notes.classList.toggle('show');
}

document.addEventListener('keydown', (e) => {
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault();
    nextSlide();
  }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault();
    prevSlide();
  }
  if (e.key.toLowerCase() === 'n') toggleNotes();
  if (e.key.toLowerCase() === 'f') {
    document.documentElement.requestFullscreen?.();
  }
});

let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});
document.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if (Math.abs(diff) > 60) {
    if (diff > 0) nextSlide();
    else prevSlide();
  }
});

// Inicia o processo de carregamento quando o script roda
loadSlides();

function initShoalCanvases() {
  const canvases = [...document.querySelectorAll('.shoal-canvas')];
  if (!canvases.length) return;

  canvases.forEach((canvas) => {
    const sceneExists = shoalScenes.some((scene) => scene.canvas === canvas);
    if (sceneExists) return;
    const fishCount = Number.parseInt(canvas.dataset.fishCount || '9', 10);
    shoalScenes.push(createShoalScene(canvas, fishCount));
  });

  handleShoalResize();

  if (!shoalAnimationFrame) {
    shoalAnimationFrame = window.requestAnimationFrame(animateShoals);
  }

  if (!window.__shoalResizeBound) {
    window.addEventListener('resize', handleShoalResize, { passive: true });
    window.__shoalResizeBound = true;
  }
}

function handleShoalResize() {
  shoalScenes.forEach((scene) => resizeShoalScene(scene));
}

function initExperimentScenes() {
  const canvases = [...document.querySelectorAll('.experiment-arena-canvas')];
  if (!canvases.length) return;

  canvases.forEach((canvas) => {
    const sceneExists = experimentScenes.some((scene) => scene.canvas === canvas);
    if (sceneExists) return;

    const root = canvas.closest('.experiment-visual');
    const xLine = root?.querySelector('.experiment-graph__line--x');
    const yLine = root?.querySelector('.experiment-graph__line--y');
    const xMarker = root?.querySelector('.experiment-graph__marker--x');
    const yMarker = root?.querySelector('.experiment-graph__marker--y');

    experimentScenes.push(createExperimentScene(canvas, xLine, yLine, xMarker, yMarker));
  });

  handleExperimentResize();

  if (!experimentAnimationFrame) {
    experimentAnimationFrame = window.requestAnimationFrame(animateExperiments);
  }

  if (!window.__experimentResizeBound) {
    window.addEventListener('resize', handleExperimentResize, { passive: true });
    window.__experimentResizeBound = true;
  }
}

function handleExperimentResize() {
  experimentScenes.forEach((scene) => resizeExperimentScene(scene));
}

function initDualFishScenes() {
  const canvases = [...document.querySelectorAll('.te-dual-fish-canvas')];
  if (!canvases.length) return;

  canvases.forEach((canvas) => {
    const sceneExists = dualFishScenes.some((scene) => scene.canvas === canvas);
    if (sceneExists) return;
    dualFishScenes.push(createDualFishScene(canvas));
  });

  handleDualFishResize();
  syncDualFishStages();

  if (!dualFishAnimationFrame) {
    dualFishAnimationFrame = window.requestAnimationFrame(animateDualFishScenes);
  }

  if (!window.__dualFishResizeBound) {
    window.addEventListener('resize', handleDualFishResize, { passive: true });
    window.__dualFishResizeBound = true;
  }
}

function handleDualFishResize() {
  dualFishScenes.forEach((scene) => resizeDualFishScene(scene));
}

function createDualFishScene(canvas) {
  const scene = {
    canvas,
    ctx: canvas.getContext('2d'),
    width: 0,
    height: 0,
    radius: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    time: Math.random() * 100,
    stage: 0,
    bluePath: [],
    yellowPath: [],
    blue: { x: 0, y: 0, vx: 1.05, vy: -0.35, targetX: 0, targetY: 0, retargetAt: 0, pulse: Math.random() * Math.PI * 2, size: 1.05 },
    yellow: { x: 0, y: 0, vx: -0.7, vy: 0.72, targetX: 0, targetY: 0, retargetAt: 0, pulse: Math.random() * Math.PI * 2, size: 1.05 },
  };

  resizeDualFishScene(scene);
  resetDualFishScene(scene);
  return scene;
}

function resizeDualFishScene(scene) {
  const rect = scene.canvas.getBoundingClientRect();
  scene.width = Math.max(1, rect.width);
  scene.height = Math.max(1, rect.height);
  scene.radius = Math.min(scene.width, scene.height) * 0.5;
  scene.dpr = Math.min(window.devicePixelRatio || 1, 2);
  scene.canvas.width = Math.round(scene.width * scene.dpr);
  scene.canvas.height = Math.round(scene.height * scene.dpr);
  scene.ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);

  if (scene.width > 1 && scene.height > 1 && (!scene.blue.x || !scene.yellow.x)) {
    resetDualFishScene(scene);
  }
}

function resetDualFishScene(scene) {
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  scene.blue.x = cx - scene.radius * 0.18;
  scene.blue.y = cy + scene.radius * 0.08;
  scene.yellow.x = cx + scene.radius * 0.16;
  scene.yellow.y = cy - scene.radius * 0.12;
  chooseDualFishTarget(scene, scene.blue, 0);
  chooseDualFishTarget(scene, scene.yellow, Math.PI * 0.8);
  scene.bluePath = [];
  scene.yellowPath = [];
}

function syncDualFishStages() {
  dualFishScenes.forEach((scene) => {
    const slide = scene.canvas.closest('.te-sequence-slide');
    scene.stage = Number.parseInt(slide?.dataset.stage || '0', 10);
    resizeDualFishScene(scene);
  });
}

function animateDualFishScenes() {
  dualFishAnimationFrame = window.requestAnimationFrame(animateDualFishScenes);
  dualFishScenes.forEach((scene) => drawDualFishScene(scene));
}

function drawDualFishScene(scene) {
  const slide = scene.canvas.closest('.slide');
  if (!slide?.classList.contains('active')) return;
  if (scene.stage > 3) return;

  const { ctx, width, height, radius } = scene;
  if (width <= 1 || height <= 1) return;

  scene.time += 0.016;
  updateDualFish(scene, scene.blue, 0);
  if (scene.stage >= 1) updateDualFish(scene, scene.yellow, Math.PI * 0.8);

  scene.bluePath.push({ x: scene.blue.x, y: scene.blue.y });
  scene.yellowPath.push({ x: scene.yellow.x, y: scene.yellow.y });
  if (scene.bluePath.length > 170) scene.bluePath.shift();
  if (scene.yellowPath.length > 170) scene.yellowPath.shift();

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius * 0.9, 0, Math.PI * 2);
  ctx.clip();

  const water = ctx.createRadialGradient(width * 0.46, height * 0.42, radius * 0.1, width / 2, height / 2, radius * 0.95);
  water.addColorStop(0, 'rgba(56, 119, 190, 0.20)');
  water.addColorStop(0.7, 'rgba(13, 38, 78, 0.62)');
  water.addColorStop(1, 'rgba(8, 24, 50, 0.92)');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  if (scene.stage >= 2) drawDualFishTrail(ctx, scene.bluePath, 'rgba(96,231,255,');
  if (scene.stage >= 3) drawDualFishTrail(ctx, scene.yellowPath, 'rgba(255,208,94,');

  drawDualFish(ctx, scene.blue, '#60e7ff', '#dff8ff');
  if (scene.stage >= 1) drawDualFish(ctx, scene.yellow, '#ffd166', '#fff2bf');
  ctx.restore();
}

function updateDualFish(scene, fish, phase) {
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  const maxRadius = scene.radius * 0.72;
  if (!fish.targetX || scene.time >= fish.retargetAt) {
    chooseDualFishTarget(scene, fish, phase);
  }

  const dx = fish.x - cx;
  const dy = fish.y - cy;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = dx / distance;
  const ny = dy / distance;

  const targetDx = fish.targetX - fish.x;
  const targetDy = fish.targetY - fish.y;
  const targetDistance = Math.hypot(targetDx, targetDy) || 1;
  const edgeForce = Math.max(0, distance - maxRadius * 0.78) / Math.max(1, maxRadius * 0.22);
  const wanderX = Math.sin(scene.time * 1.7 + phase) * 0.018 + Math.cos(scene.time * 0.73 + phase * 1.7) * 0.012;
  const wanderY = Math.cos(scene.time * 1.35 + phase) * 0.018 + Math.sin(scene.time * 0.82 + phase * 1.3) * 0.012;

  fish.vx = fish.vx * 0.94
    + (targetDx / targetDistance) * 0.055
    - nx * edgeForce * 0.14
    + wanderX;
  fish.vy = fish.vy * 0.94
    + (targetDy / targetDistance) * 0.055
    - ny * edgeForce * 0.14
    + wanderY;

  const speed = Math.hypot(fish.vx, fish.vy) || 1;
  const targetSpeed = 0.9 + 0.45 * ((Math.sin(scene.time * 0.9 + phase) + 1) / 2);
  const clampedSpeed = Math.min(Math.max(speed, 0.45), targetSpeed);
  fish.vx = (fish.vx / speed) * clampedSpeed;
  fish.vy = (fish.vy / speed) * clampedSpeed;
  fish.x += fish.vx;
  fish.y += fish.vy;
  fish.pulse += 0.2;

  const nextDistance = Math.hypot(fish.x - cx, fish.y - cy);
  if (nextDistance > maxRadius) {
    const bx = (fish.x - cx) / nextDistance;
    const by = (fish.y - cy) / nextDistance;
    fish.x = cx + bx * maxRadius;
    fish.y = cy + by * maxRadius;
    const dot = fish.vx * bx + fish.vy * by;
    fish.vx -= 2 * dot * bx;
    fish.vy -= 2 * dot * by;
  }
}

function chooseDualFishTarget(scene, fish, phase) {
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  const angle = Math.random() * Math.PI * 2;
  const distance = scene.radius * (0.18 + Math.random() * 0.46);
  fish.targetX = cx + Math.cos(angle) * distance;
  fish.targetY = cy + Math.sin(angle) * distance;
  fish.retargetAt = scene.time + 1.9 + Math.random() * 1.9 + Math.abs(Math.sin(phase)) * 0.35;
}

function drawDualFishTrail(ctx, path, colorPrefix) {
  if (path.length < 2) return;
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < path.length; i += 1) {
    const alpha = (i / path.length) * 0.36;
    ctx.strokeStyle = `${colorPrefix}${alpha})`;
    ctx.beginPath();
    ctx.moveTo(path[i - 1].x, path[i - 1].y);
    ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDualFish(ctx, fish, bodyColor, highlightColor) {
  const angle = Math.atan2(fish.vy, fish.vx);
  const bodyLength = 18 * fish.size;
  const bodyHeight = 7.2 * fish.size;
  const tailSwing = Math.sin(fish.pulse) * 0.34;

  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(angle);

  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = 14;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(bodyLength * 0.78, 0);
  ctx.quadraticCurveTo(bodyLength * 0.25, bodyHeight, -bodyLength * 0.78, bodyHeight * 0.45);
  ctx.quadraticCurveTo(-bodyLength * 0.55, 0, -bodyLength * 0.78, -bodyHeight * 0.45);
  ctx.quadraticCurveTo(bodyLength * 0.25, -bodyHeight, bodyLength * 0.78, 0);
  ctx.fill();

  ctx.save();
  ctx.translate(-bodyLength * 0.78, 0);
  ctx.rotate(tailSwing);
  ctx.fillStyle = highlightColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-bodyLength * 0.55, bodyHeight * 0.9);
  ctx.lineTo(-bodyLength * 0.28, 0);
  ctx.lineTo(-bodyLength * 0.55, -bodyHeight * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#06111f';
  ctx.beginPath();
  ctx.arc(bodyLength * 0.48, -bodyHeight * 0.12, 1.3 * fish.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function createExperimentScene(canvas, xLine, yLine, xMarker, yMarker) {
  const ctx = canvas.getContext('2d');
  const scene = {
    canvas,
    ctx,
    xLine,
    yLine,
    xMarker,
    yMarker,
    width: 0,
    height: 0,
    radius: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    historyX: [],
    historyY: [],
    maxHistory: 500,
    fish: {
      x: 0,
      y: 0,
      vx: 1.1,
      vy: 0.7,
      pulse: Math.random() * Math.PI * 2,
      size: 1.08,
      noise: Math.random() * Math.PI * 2,
      hueShift: 0,
    },
    time: Math.random() * 1000,
  };

  resizeExperimentScene(scene);
  scene.fish.x = scene.width / 2 + scene.radius * 0.22;
  scene.fish.y = scene.height / 2 - scene.radius * 0.1;
  fillExperimentHistory(scene);
  return scene;
}

function resizeExperimentScene(scene) {
  const previousWidth = scene.width;
  const previousHeight = scene.height;
  const rect = scene.canvas.getBoundingClientRect();
  scene.width = Math.max(1, rect.width);
  scene.height = Math.max(1, rect.height);
  scene.radius = Math.min(scene.width, scene.height) * 0.5;
  scene.dpr = Math.min(window.devicePixelRatio || 1, 2);
  scene.canvas.width = Math.round(scene.width * scene.dpr);
  scene.canvas.height = Math.round(scene.height * scene.dpr);
  scene.ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);

  const becameVisible = (previousWidth <= 1 || previousHeight <= 1) && scene.width > 1 && scene.height > 1;
  if (becameVisible) {
    scene.fish.x = scene.width / 2 + scene.radius * 0.22;
    scene.fish.y = scene.height / 2 - scene.radius * 0.1;
    fillExperimentHistory(scene);
    drawExperimentScene(scene);
  }
}

function fillExperimentHistory(scene) {
  scene.historyX = [];
  scene.historyY = [];
  const baseX = scene.fish.x / scene.width;
  const baseY = scene.fish.y / scene.height;
  let seedX = baseX + (Math.random() - 0.5) * 0.08;
  let seedY = baseY + (Math.random() - 0.5) * 0.08;

  for (let i = 0; i < scene.maxHistory - 1; i += 1) {
    seedX = clamp01(seedX + (Math.random() - 0.5) * 0.035);
    seedY = clamp01(seedY + (Math.random() - 0.5) * 0.035);
    scene.historyX.push(seedX);
    scene.historyY.push(seedY);
  }

  scene.historyX.push(baseX);
  scene.historyY.push(baseY);
  updateExperimentGraphs(scene);
}

function animateExperiments() {
  experimentAnimationFrame = window.requestAnimationFrame(animateExperiments);
  experimentScenes.forEach((scene) => drawExperimentScene(scene));
}

function drawExperimentScene(scene) {
  scene.time += 0.016;
  updateExperimentFish(scene);
  updateExperimentGraphs(scene);

  const { ctx, width, height, radius } = scene;
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius * 0.9, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = 'rgba(12, 36, 74, 0.55)';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius * 0.58, 0, Math.PI * 2);
  ctx.stroke();

  drawExperimentTrace(scene);
  drawFish(ctx, scene.fish);

  ctx.restore();
}

function updateExperimentFish(scene) {
  const fish = scene.fish;
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  const maxRadius = scene.radius * 0.78;

  const toCenterX = cx - fish.x;
  const toCenterY = cy - fish.y;
  const centerDistance = Math.hypot(toCenterX, toCenterY) || 1;
  const nx = toCenterX / centerDistance;
  const ny = toCenterY / centerDistance;
  const tangentX = -ny;
  const tangentY = nx;

  const edgeStart = maxRadius * 0.82;
  const edgeForce = Math.max(0, centerDistance - edgeStart) / Math.max(1, maxRadius - edgeStart);
  const perturbation = Math.sin(scene.time * 1.15 + fish.noise) * 0.018;

  fish.vx += nx * (0.002 + edgeForce * 0.07) + tangentX * perturbation;
  fish.vy += ny * (0.002 + edgeForce * 0.07) + tangentY * perturbation;

  const speed = Math.hypot(fish.vx, fish.vy) || 1;
  const targetSpeed = 1.15;
  fish.vx = (fish.vx / speed) * targetSpeed;
  fish.vy = (fish.vy / speed) * targetSpeed;

  fish.x += fish.vx;
  fish.y += fish.vy;
  fish.pulse += 0.22;

  const dx = fish.x - cx;
  const dy = fish.y - cy;
  const distanceFromCenter = Math.hypot(dx, dy);
  if (distanceFromCenter > maxRadius) {
    const bx = dx / distanceFromCenter;
    const by = dy / distanceFromCenter;
    fish.x = cx + bx * maxRadius;
    fish.y = cy + by * maxRadius;
    const dot = fish.vx * bx + fish.vy * by;
    fish.vx -= 2 * dot * bx;
    fish.vy -= 2 * dot * by;
  }

  scene.historyX.push(fish.x / scene.width);
  scene.historyY.push(fish.y / scene.height);
  if (scene.historyX.length > scene.maxHistory) {
    scene.historyX.shift();
    scene.historyY.shift();
  }
}

function drawExperimentTrace(scene) {
  const { ctx, width, height } = scene;
  if (!scene.historyX.length) return;

  ctx.strokeStyle = 'rgba(96,231,255,0.20)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();

  scene.historyX.forEach((xNorm, index) => {
    const x = xNorm * width;
    const y = scene.historyY[index] * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function updateExperimentGraphs(scene) {
  if (!scene.xLine || !scene.yLine || !scene.xMarker || !scene.yMarker) return;
  renderGraphLine(scene.xLine, scene.xMarker, scene.historyX);
  renderGraphLine(scene.yLine, scene.yMarker, scene.historyY);
}

function renderGraphLine(line, marker, values) {
  if (!line || !marker) return;
  const points = buildGraphPoints(values);
  const pointsAttr = points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  line.setAttribute('points', pointsAttr);

  const lastPoint = points.at(-1);
  if (!lastPoint) {
    marker.setAttribute('r', '0');
    return;
  }

  marker.setAttribute('cx', lastPoint.x.toFixed(1));
  marker.setAttribute('cy', lastPoint.y.toFixed(1));
  marker.setAttribute('r', '4.4');
}

function buildGraphPoints(values) {
  const width = 320;
  const height = 120;
  if (!values.length) return [];

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - value * height;
      return { x, y };
    });
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function createShoalScene(canvas, fishCount) {
  const ctx = canvas.getContext('2d');
  const vectorRoot = canvas.closest('.polarization-slide__visual');
  const speedFactor = Math.max(0.1, Number.parseFloat(canvas.dataset.speedFactor || '1') || 1);
  const sceneType = canvas.dataset.sceneType || 'circular';
  const scene = {
    canvas,
    ctx,
    fish: [],
    width: 0,
    height: 0,
    radius: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    time: Math.random() * 1000,
    pulseOffset: Math.random() * Math.PI * 2,
    speedFactor,
    sceneType,
    isThreatScene: sceneType === 'threat',
    usePolarizationVectors: canvas.dataset.polarizationVectors === 'true',
    vectorArrows: vectorRoot ? [...vectorRoot.querySelectorAll('.polarization-slide__meter-arrow')] : [],
    predator: null,
  };

  resizeShoalScene(scene);

  if (scene.isThreatScene) {
    seedThreatScene(scene, fishCount);
  } else {
    for (let i = 0; i < fishCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * scene.radius * 0.72;
      const speed = (0.55 + Math.random() * 0.45) * scene.speedFactor;
      scene.fish.push({
        x: scene.width / 2 + Math.cos(angle) * distance,
        y: scene.height / 2 + Math.sin(angle) * distance,
        vx: Math.cos(angle + Math.PI / 2) * speed,
        vy: Math.sin(angle + Math.PI / 2) * speed,
        size: 0.8 + Math.random() * 0.8,
        pulse: Math.random() * Math.PI * 2,
        turnBias: (Math.random() - 0.5) * 0.02,
        hueShift: Math.random() * 0.18,
      });
    }
  }

  return scene;
}

function resizeShoalScene(scene) {
  const rect = scene.canvas.getBoundingClientRect();
  scene.width = Math.max(1, rect.width);
  scene.height = Math.max(1, rect.height);
  scene.radius = Math.min(scene.width, scene.height) * 0.5;
  scene.dpr = Math.min(window.devicePixelRatio || 1, 2);
  scene.canvas.width = Math.round(scene.width * scene.dpr);
  scene.canvas.height = Math.round(scene.height * scene.dpr);
  scene.ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);

  if (scene.isThreatScene && scene.predator) {
    scene.predator.x = scene.width * 0.12;
    scene.predator.baseY = scene.height * 0.47;
    scene.predator.y = scene.predator.baseY;
  }
}

function animateShoals() {
  shoalAnimationFrame = window.requestAnimationFrame(animateShoals);
  shoalScenes.forEach((scene) => drawShoalScene(scene));
}

function drawShoalScene(scene) {
  const { ctx, width, height, radius } = scene;
  scene.time += 0.016;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  if (!scene.isThreatScene) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.clip();
  }

  if (scene.isThreatScene) {
    drawThreatSceneBackground(scene);
    updateThreatScene(scene);
    scene.fish.forEach((fish) => drawThreatFish(ctx, fish));
    drawThreatPredator(scene);
  } else {
    drawWaterLight(scene);
    drawCenterPulse(scene);
    updateFish(scene);
    syncShoalVectorMeter(scene);
    scene.fish.forEach((fish) => drawFish(ctx, fish));
    drawEdgeReflection(scene);
  }

  ctx.restore();
}

function drawWaterLight(scene) {
  const { ctx, width, height } = scene;

  const water = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    width * 0.08,
    width * 0.5,
    height * 0.5,
    width * 0.58
  );
  water.addColorStop(0, 'rgba(158,198,232,0.08)');
  water.addColorStop(0.62, 'rgba(56,102,168,0.05)');
  water.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, width, height);
}

function updateFish(scene) {
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  const maxRadius = scene.radius * 0.8;
  const speedFactor = scene.speedFactor || 1;
  const attractionRadius = 92;
  const repulsionRadius = 30;
  const pulseWave = (Math.sin(scene.time * 0.95 + scene.pulseOffset) + 1) * 0.5;
  const pulseEnvelope = Math.pow(pulseWave, 3.2);
  const pulseRadius = maxRadius * (0.18 + pulseEnvelope * 0.16);
  const pulseStrength = 0.018 + pulseEnvelope * 0.085;

  scene.fish.forEach((fish, index) => {
    let alignX = 0;
    let alignY = 0;
    let attractionX = 0;
    let attractionY = 0;
    let repulsionX = 0;
    let repulsionY = 0;
    let neighborCount = 0;

    scene.fish.forEach((other, otherIndex) => {
      if (index === otherIndex) return;

      const dx = other.x - fish.x;
      const dy = other.y - fish.y;
      const distance = Math.hypot(dx, dy);
      if (!distance || distance > attractionRadius) return;

      alignX += other.vx;
      alignY += other.vy;
      attractionX += dx / distance;
      attractionY += dy / distance;

      if (distance < repulsionRadius) {
        const repel = (repulsionRadius - distance) / repulsionRadius;
        repulsionX -= (dx / distance) * repel;
        repulsionY -= (dy / distance) * repel;
      }

      neighborCount += 1;
    });

    if (neighborCount) {
      alignX = alignX / neighborCount - fish.vx;
      alignY = alignY / neighborCount - fish.vy;
      attractionX /= neighborCount;
      attractionY /= neighborCount;
    }

    const toCenterX = cx - fish.x;
    const toCenterY = cy - fish.y;
    const centerDistance = Math.hypot(toCenterX, toCenterY) || 1;
    const edgeStart = maxRadius * 0.88;
    const edgeZone = Math.max(1, maxRadius - edgeStart);
    const edgeForce = Math.max(0, centerDistance - edgeStart) / edgeZone;
    const nxToCenter = toCenterX / centerDistance;
    const nyToCenter = toCenterY / centerDistance;
    const tangentX = -nyToCenter;
    const tangentY = nxToCenter;
    const swirlPhase = scene.time * 1.35 + fish.pulse + index * 0.85;
    const borderPerturbation = Math.sin(swirlPhase) * edgeForce * 0.035;
    const inwardPush = edgeForce * edgeForce * 0.11;
    const centerWander = Math.sin(scene.time * 0.8 + fish.pulse * 0.6 + index) * 0.006;
    const centerWanderY = Math.cos(scene.time * 0.7 + fish.pulse * 0.5 + index * 0.7) * 0.006;
    const outerBias = Math.max(0, (centerDistance - maxRadius * 0.35) / (maxRadius * 0.65));
    const pulseFocus = Math.max(0, 1 - centerDistance / Math.max(1, pulseRadius));
    const pulseAttraction = pulseStrength * (0.35 + outerBias * 1.2) * (0.25 + pulseFocus);

    fish.vx += alignX * 0.004
      + attractionX * 0.010
      + repulsionX * 0.030
      + nxToCenter * inwardPush
      + nxToCenter * pulseAttraction
      + tangentX * borderPerturbation
      + centerWander;
    fish.vy += alignY * 0.004
      + attractionY * 0.010
      + repulsionY * 0.028
      + nyToCenter * inwardPush
      + nyToCenter * pulseAttraction
      + tangentY * borderPerturbation
      + centerWanderY;

    fish.vx += fish.turnBias * 0.35;
    fish.vy += Math.sin(scene.time + index * 1.3) * fish.turnBias * 0.35;

    const speed = Math.hypot(fish.vx, fish.vy) || 1;
    const clampedSpeed = Math.min(Math.max(speed, 0.45 * speedFactor), 1.65 * speedFactor);
    fish.vx = (fish.vx / speed) * clampedSpeed;
    fish.vy = (fish.vy / speed) * clampedSpeed;

    fish.x += fish.vx;
    fish.y += fish.vy;
    fish.pulse += 0.22;

    const dx = fish.x - cx;
    const dy = fish.y - cy;
    const distanceFromCenter = Math.hypot(dx, dy);

    if (distanceFromCenter > maxRadius) {
      const nx = dx / distanceFromCenter;
      const ny = dy / distanceFromCenter;
      fish.x = cx + nx * maxRadius;
      fish.y = cy + ny * maxRadius;
      const dot = fish.vx * nx + fish.vy * ny;
      fish.vx -= 2 * dot * nx;
      fish.vy -= 2 * dot * ny;
    }
  });
}

function seedThreatScene(scene, fishCount) {
  scene.fish = [];
  const cx = scene.width / 2;
  const cy = scene.height / 2;

  scene.predator = {
    x: scene.width * 0.1,
    y: cy,
    baseY: cy,
    size: 0.33,
    vx: scene.width * 0.00045,
    vy: (Math.random() - 0.5) * 0.0002
  };

  for (let i = 0; i < fishCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const spawnX = cx + (Math.random() - 0.5) * scene.width * 0.8;
    const spawnY = cy + (Math.random() - 0.5) * scene.height * 0.8;
    const dxCenter = spawnX - cx;
    const dyCenter = spawnY - cy;
    const centerAngle = Math.atan2(dyCenter, dxCenter);
    const speed = (0.17 + Math.random() * 0.09) * scene.speedFactor;
    scene.fish.push({
      x: spawnX,
      y: spawnY,
      vx: speed * -Math.sin(centerAngle),
      vy: speed * Math.cos(centerAngle),
      size: 0.525 + Math.random() * 0.3,
      pulse: Math.random() * Math.PI * 2,
      turnBias: (Math.random() - 0.5) * 0.012,
      hueShift: 0,
    });
  }
}

function drawThreatSceneBackground(scene) {
  const { ctx, width, height } = scene;
  // Retangular dark blue background
  ctx.fillStyle = '#0a1932';
  ctx.fillRect(0, 0, width, height);

  // Soft linear gradient to simulate depth
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, 'rgba(56,102,168,0.12)');
  bg.addColorStop(0.5, 'rgba(158,198,232,0.15)');
  bg.addColorStop(1, 'rgba(56,102,168,0.08)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function updateThreatScene(scene) {
  const { width, height, predator } = scene;
  const cx = width / 2;
  const cy = height / 2;

  // Read tuning parameters (if they exist in the DOM)
  const elPrey = document.getElementById('tune-prey-speed');
  const elPred = document.getElementById('tune-pred-speed');
  const elCoh = document.getElementById('tune-cohesion');
  const elRep = document.getElementById('tune-repulsion');
  const elAlign = document.getElementById('tune-align-radius');
  const elPreyRep = document.getElementById('tune-prey-repulsion');
  const elWaypoint = document.getElementById('tune-waypoint');
  
  const multPrey = elPrey ? parseFloat(elPrey.value) : 3.0;
  const multPred = elPred ? parseFloat(elPred.value) : 3.0;
  const multCoh = elCoh ? parseFloat(elCoh.value) : 1.2;
  const multRep = elRep ? parseFloat(elRep.value) : 1.0;
  const multAlign = elAlign ? parseFloat(elAlign.value) : 1.0;
  const multPreyRep = elPreyRep ? parseFloat(elPreyRep.value) : 2.2;
  const multWaypoint = elWaypoint ? parseFloat(elWaypoint.value) : 2.7;

  if (predator.turnBias === undefined) {
    predator.turnBias = 0;
  }
  
  if (Math.random() < 0.015) {
    predator.turnBias = (Math.random() - 0.5) * 0.02;
  }
  
  const pMarginX = width * 0.1;
  const pMarginY = height * 0.1;
  let pAvoidX = 0;
  let pAvoidY = 0;
  
  if (predator.x < pMarginX) pAvoidX += (pMarginX - predator.x) / pMarginX * 0.0005 * width;
  if (predator.x > width - pMarginX) pAvoidX -= (predator.x - (width - pMarginX)) / pMarginX * 0.0005 * width;
  if (predator.y < pMarginY) pAvoidY += (pMarginY - predator.y) / pMarginY * 0.0005 * width;
  if (predator.y > height - pMarginY) pAvoidY -= (predator.y - (height - pMarginY)) / pMarginY * 0.0005 * width;

  predator.vx += pAvoidX;
  predator.vy += pAvoidY;

  const pAngle = Math.atan2(predator.vy, predator.vx) + predator.turnBias;
  const pTargetSpeed = width * 0.00022 * multPred;
  
  predator.vx = Math.cos(pAngle) * pTargetSpeed;
  predator.vy = Math.sin(pAngle) * pTargetSpeed;

  predator.x += predator.vx;
  predator.y += predator.vy;
  
  predator.x = Math.max(0, Math.min(width, predator.x));
  predator.y = Math.max(0, Math.min(height, predator.y));

  if (!scene.targetPoint) {
    scene.targetPoint = { x: cx, y: cy, active: false, timer: 3.0 };
  }
  
  scene.targetPoint.timer -= 0.016;
  if (scene.targetPoint.timer <= 0) {
    scene.targetPoint.active = true;
    scene.targetPoint.x = width * 0.15 + Math.random() * width * 0.7;
    scene.targetPoint.y = height * 0.15 + Math.random() * height * 0.7;
    scene.targetPoint.timer = 6.0 + Math.random() * 4.0; 
  }
  
  if (scene.targetPoint.active) {
    let shoalCx = 0;
    let shoalCy = 0;
    scene.fish.forEach(f => { shoalCx += f.x; shoalCy += f.y; });
    shoalCx /= scene.fish.length;
    shoalCy /= scene.fish.length;
    
    const distToTarget = Math.hypot(shoalCx - scene.targetPoint.x, shoalCy - scene.targetPoint.y);
    if (distToTarget < width * 0.12) {
      scene.targetPoint.active = false;
    }
  }

  const repelRadius = width * 0.24;
  const alignRadius = width * 0.12 * multAlign;
  const cohesionRadius = width * 0.16 * multAlign;

  scene.fish.forEach((fish, index) => {
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let repulsionX = 0;
    let repulsionY = 0;
    let neighborCount = 0;
    let maxNeighborAlarm = 0;

    scene.fish.forEach((other, otherIndex) => {
      if (index === otherIndex) return;
      const dx = other.x - fish.x;
      const dy = other.y - fish.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 0 && distance < width * 0.06) {
         const otherAlarm = Math.max(other.directAlarm || 0, other.warnLevel || 0);
         if (otherAlarm > maxNeighborAlarm) {
             maxNeighborAlarm = otherAlarm;
         }
      }

      if (!distance || distance > cohesionRadius) return;

      if (distance < alignRadius) {
        alignX += other.vx;
        alignY += other.vy;
      }
      cohesionX += dx / distance;
      cohesionY += dy / distance;
      
      if (distance < width * 0.035) {
        const repel = (width * 0.035 - distance) / (width * 0.035);
        repulsionX -= (dx / distance) * repel * multPreyRep;
        repulsionY -= (dy / distance) * repel * multPreyRep;
      }
      
      neighborCount += 1;
    });

    if (neighborCount) {
      alignX = alignX / neighborCount - fish.vx;
      alignY = alignY / neighborCount - fish.vy;
      cohesionX /= neighborCount;
      cohesionY /= neighborCount;
    }

    const dxPred = fish.x - predator.x;
    const dyPred = fish.y - predator.y;
    const predatorDistance = Math.hypot(dxPred, dyPred) || 1;
    
    const outerRingDist = width * 0.12 * Math.sqrt(multRep);
    
    let directAlarm = 0;
    if (predatorDistance <= outerRingDist) {
       const innerRadius = width * 0.04 * Math.sqrt(multRep);
       const forceRatio = Math.pow(innerRadius / Math.max(predatorDistance, innerRadius), 2);
       directAlarm = Math.min(1.0, forceRatio);
    }
    fish.directAlarm = directAlarm;

    if (fish.warnLevel === undefined) fish.warnLevel = 0;
    
    if (maxNeighborAlarm * 0.75 > fish.warnLevel) {
        fish.warnLevel = maxNeighborAlarm * 0.75;
    } else {
        fish.warnLevel -= 0.015;
        if (fish.warnLevel < 0) fish.warnLevel = 0;
    }
    
    fish.infoForce = Math.max(directAlarm, fish.warnLevel);
    const infoForce = fish.infoForce;
    
    const minDistance = width * 0.04;
    const safeDist = Math.max(predatorDistance, minDistance);
    const predatorForce = 0.28 * multRep * Math.pow(minDistance / safeDist, 2);
    
    const nxPred = dxPred / predatorDistance;
    const nyPred = dyPred / predatorDistance;

    const collectiveDrift = 0.002 + predatorForce * 0.055;
    const scatterX = nxPred * predatorForce * 0.15 + (Math.random() - 0.5) * infoForce * 0.02;
    const scatterY = nyPred * predatorForce * 0.15 + (Math.random() - 0.5) * infoForce * 0.02;

    const marginX = width * 0.1;
    const marginY = height * 0.1;
    let edgeForceX = 0;
    let edgeForceY = 0;
    
    if (fish.x < marginX) edgeForceX += Math.pow((marginX - fish.x) / marginX, 2) * 0.05;
    if (fish.x > width - marginX) edgeForceX -= Math.pow((fish.x - (width - marginX)) / marginX, 2) * 0.05;
    if (fish.y < marginY) edgeForceY += Math.pow((marginY - fish.y) / marginY, 2) * 0.05;
    if (fish.y > height - marginY) edgeForceY -= Math.pow((fish.y - (height - marginY)) / marginY, 2) * 0.05;

    let pullX = 0;
    let pullY = 0;
    if (scene.targetPoint && scene.targetPoint.active) {
       const dxT = scene.targetPoint.x - fish.x;
       const dyT = scene.targetPoint.y - fish.y;
       const distT = Math.hypot(dxT, dyT) || 1;
       pullX = (dxT / distT) * 0.008 * multWaypoint;
       pullY = (dyT / distT) * 0.008 * multWaypoint;
    } else {
       pullX = Math.sin(scene.time * 0.5 + index) * 0.002;
       pullY = Math.cos(scene.time * 0.4 + index) * 0.002;
    }

    fish.vx += alignX * (0.01 - infoForce * 0.008)
      + cohesionX * (0.006 - infoForce * 0.005) * multCoh
      + repulsionX * 0.0035
      + edgeForceX
      + pullX
      + scatterX
      + collectiveDrift
      + fish.turnBias * 0.22;
    fish.vy += alignY * (0.01 - infoForce * 0.008)
      + cohesionY * (0.006 - infoForce * 0.005) * multCoh
      + repulsionY * 0.0035
      + edgeForceY
      + pullY
      + scatterY
      + Math.sin(scene.time * 0.85 + index) * 0.0025;

    const speed = Math.hypot(fish.vx, fish.vy) || 1;
    const minSpeed = 0.025 * scene.speedFactor * multPrey;
    const maxSpeed = (0.175 * scene.speedFactor + predatorForce * 0.125) * multPrey;
    const clampedSpeed = Math.min(Math.max(speed, minSpeed), maxSpeed);
    fish.vx = (fish.vx / speed) * clampedSpeed;
    fish.vy = (fish.vy / speed) * clampedSpeed;

    fish.x += fish.vx;
    fish.y += fish.vy;
    fish.pulse += 0.18;

    if (fish.x < 0) { fish.x = 0; fish.vx = Math.abs(fish.vx); }
    if (fish.x > width) { fish.x = width; fish.vx = -Math.abs(fish.vx); }
    if (fish.y < 0) { fish.y = 0; fish.vy = Math.abs(fish.vy); }
    if (fish.y > height) { fish.y = height; fish.vy = -Math.abs(fish.vy); }
  });
}

function drawThreatFish(ctx, fish) {
  const angle = Math.atan2(fish.vy, fish.vx);
  const bodyLength = 13.5 * fish.size;
  const bodyHeight = 5.2 * fish.size;
  const tailSwing = Math.sin(fish.pulse) * 0.32;
  const infoForce = fish.infoForce || 0;

  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyLength * (1.4 + infoForce * 0.8));
  const rGlow = Math.round(96 + infoForce * 159);
  const gGlow = Math.round(231 - infoForce * 100);
  const bGlow = Math.round(255 - infoForce * 200);
  glow.addColorStop(0, `rgba(${rGlow},${gGlow},${bGlow},${0.16 + infoForce * 0.2})`);
  glow.addColorStop(1, `rgba(${rGlow},${gGlow},${bGlow},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(-bodyLength * 0.05, 0, bodyLength * (1.2 + infoForce * 0.3), bodyHeight * (1.7 + infoForce * 0.3), 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(-bodyLength * 0.8, 0, bodyLength * 0.8, 0);
  if (infoForce > 0.05) {
    bodyGradient.addColorStop(0, `rgba(255, 180, 50, ${0.82 + infoForce * 0.18})`);
    bodyGradient.addColorStop(0.3, `rgba(255, 120, 30, ${0.95 + infoForce * 0.05})`);
    bodyGradient.addColorStop(0.7, `rgba(255, 90, 20, ${0.98 + infoForce * 0.02})`);
    bodyGradient.addColorStop(1, `rgba(255, 200, 100, ${0.72 + infoForce * 0.28})`);
  } else {
    bodyGradient.addColorStop(0, 'rgba(155,236,255,0.82)');
    bodyGradient.addColorStop(0.3, 'rgba(71,204,243,0.95)');
    bodyGradient.addColorStop(0.7, 'rgba(93,227,255,0.98)');
    bodyGradient.addColorStop(1, 'rgba(167,242,255,0.72)');
  }
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(bodyLength * 0.78, 0);
  ctx.quadraticCurveTo(bodyLength * 0.22, bodyHeight * 0.92, -bodyLength * 0.76, bodyHeight * 0.42);
  ctx.quadraticCurveTo(-bodyLength * 0.55, 0, -bodyLength * 0.76, -bodyHeight * 0.42);
  ctx.quadraticCurveTo(bodyLength * 0.22, -bodyHeight * 0.92, bodyLength * 0.78, 0);
  ctx.fill();

  ctx.save();
  ctx.translate(-bodyLength * 0.76, 0);
  ctx.rotate(tailSwing);
  if (infoForce > 0.1) {
    ctx.fillStyle = `rgba(255, 100, 20, ${0.74 + infoForce * 0.26})`;
  } else {
    ctx.fillStyle = 'rgba(117,223,255,0.74)';
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-bodyLength * 0.54, bodyHeight * 0.88);
  ctx.lineTo(-bodyLength * 0.26, 0);
  ctx.lineTo(-bodyLength * 0.54, -bodyHeight * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.arc(bodyLength * 0.48, -bodyHeight * 0.1, 0.9 * fish.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawThreatPredator(scene) {
  const { ctx, predator } = scene;
  const angle = Math.atan2(predator.vy || 0, predator.vx || 1);
  const bodyLength = 48 * predator.size;
  const bodyHeight = 12 * predator.size;
  const tailSwing = Math.sin(scene.time * 1.6) * 0.18;

  ctx.save();
  ctx.translate(predator.x, predator.y);

  // Read repulsion multiplier for visual rings
  const elRep = document.getElementById('tune-repulsion');
  const multRep = elRep ? parseFloat(elRep.value) : 1.0;

  // Draw concentric repulsion rings scaled by force multiplier
  ctx.strokeStyle = 'rgba(255, 95, 158, 0.25)';
  ctx.lineWidth = 1.5;
  const baseRingRadius = scene.width * 0.04 * Math.sqrt(multRep);
  [1, 2, 3].forEach(mult => {
    ctx.beginPath();
    ctx.arc(0, 0, baseRingRadius * mult, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyLength * 1.4);
  glow.addColorStop(0, 'rgba(255,95,158,0.28)');
  glow.addColorStop(1, 'rgba(255,95,158,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(-bodyLength * 0.05, 0, bodyLength * 1.25, bodyHeight * 2.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(-bodyLength * 0.85, 0, bodyLength * 0.82, 0);
  bodyGradient.addColorStop(0, 'rgba(255,130,186,0.98)');
  bodyGradient.addColorStop(0.45, 'rgba(255,86,151,0.98)');
  bodyGradient.addColorStop(1, 'rgba(255,145,198,0.82)');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(bodyLength * 0.82, 0);
  ctx.quadraticCurveTo(bodyLength * 0.25, bodyHeight * 1.05, -bodyLength * 0.82, bodyHeight * 0.46);
  ctx.quadraticCurveTo(-bodyLength * 0.58, 0, -bodyLength * 0.82, -bodyHeight * 0.46);
  ctx.quadraticCurveTo(bodyLength * 0.25, -bodyHeight * 1.05, bodyLength * 0.82, 0);
  ctx.fill();

  ctx.save();
  ctx.translate(-bodyLength * 0.84, 0);
  ctx.rotate(tailSwing);
  ctx.fillStyle = 'rgba(255,116,174,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-bodyLength * 0.34, bodyHeight * 0.9);
  ctx.lineTo(-bodyLength * 0.14, 0);
  ctx.lineTo(-bodyLength * 0.34, -bodyHeight * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(bodyLength * 0.52, -bodyHeight * 0.14, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function syncShoalVectorMeter(scene) {
  if (!scene.usePolarizationVectors || !scene.vectorArrows.length) return;

  scene.vectorArrows.forEach((arrow, index) => {
    const fish = scene.fish[index];
    const glyph = arrow.querySelector('.polarization-slide__meter-glyph') || arrow;
    if (!fish) {
      glyph.style.opacity = '0';
      return;
    }

    const angle = Math.atan2(fish.vy, fish.vx);
    glyph.style.opacity = '1';
    glyph.style.transform = `rotate(${angle}rad)`;
  });
}

function drawCenterPulse(scene) {
  const { ctx, width, height } = scene;
  const pulseWave = (Math.sin(scene.time * 0.95 + scene.pulseOffset) + 1) * 0.5;
  const pulseEnvelope = Math.pow(pulseWave, 3.2);
  const radius = scene.radius * (0.12 + pulseEnvelope * 0.18);

  const glow = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    radius
  );
  glow.addColorStop(0, `rgba(210, 242, 255, ${0.03 + pulseEnvelope * 0.05})`);
  glow.addColorStop(0.55, `rgba(120, 210, 255, ${0.01 + pulseEnvelope * 0.025})`);
  glow.addColorStop(1, 'rgba(120, 210, 255, 0)');

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFish(ctx, fish) {
  const angle = Math.atan2(fish.vy, fish.vx);
  const bodyLength = 16 * fish.size;
  const bodyHeight = 6.8 * fish.size;
  const tailSwing = Math.sin(fish.pulse) * 0.38;

  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.ellipse(-bodyLength * 0.1, bodyHeight * 0.7, bodyLength * 0.7, bodyHeight * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(-bodyLength * 0.9, 0, bodyLength * 0.8, 0);
  bodyGradient.addColorStop(0, 'rgba(177,194,205,0.95)');
  bodyGradient.addColorStop(0.28, 'rgba(10,32,72,0.96)');
  bodyGradient.addColorStop(0.52, fish.hueShift > 0.09 ? 'rgba(255,255,255,0.97)' : 'rgba(226,233,240,0.96)');
  bodyGradient.addColorStop(0.74, 'rgba(10,32,72,0.96)');
  bodyGradient.addColorStop(1, 'rgba(161,176,188,0.92)');

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(bodyLength * 0.78, 0);
  ctx.quadraticCurveTo(bodyLength * 0.32, bodyHeight * 0.92, -bodyLength * 0.8, bodyHeight * 0.42);
  ctx.quadraticCurveTo(-bodyLength * 0.55, 0, -bodyLength * 0.8, -bodyHeight * 0.42);
  ctx.quadraticCurveTo(bodyLength * 0.32, -bodyHeight * 0.92, bodyLength * 0.78, 0);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-bodyLength * 0.55, 0);
  ctx.lineTo(bodyLength * 0.5, 0);
  ctx.stroke();

  ctx.save();
  ctx.translate(-bodyLength * 0.78, 0);
  ctx.rotate(tailSwing);
  const tailGradient = ctx.createLinearGradient(0, 0, -bodyLength * 0.65, 0);
  tailGradient.addColorStop(0, 'rgba(160,178,190,0.78)');
  tailGradient.addColorStop(1, 'rgba(160,178,190,0.12)');
  ctx.fillStyle = tailGradient;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-bodyLength * 0.64, bodyHeight * 0.9);
  ctx.lineTo(-bodyLength * 0.36, 0);
  ctx.lineTo(-bodyLength * 0.64, -bodyHeight * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(bodyLength * 0.18, -bodyHeight * 0.18, bodyLength * 0.25, bodyHeight * 0.18, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#03101e';
  ctx.beginPath();
  ctx.arc(bodyLength * 0.48, -bodyHeight * 0.12, 1.3 * fish.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEdgeReflection(scene) {
  const { ctx, width, height, radius, time } = scene;
  const cx = width / 2;
  const cy = height / 2;

  for (let i = 0; i < 2; i += 1) {
    const start = time * (0.28 + i * 0.08) + i * 1.9;
    ctx.strokeStyle = `rgba(255,255,255,${0.045 - i * 0.012})`;
    ctx.lineWidth = 4 - i * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 10 - i * 9, start, start + 0.95);
    ctx.stroke();
  }

  const ring = ctx.createRadialGradient(cx, cy, radius * 0.65, cx, cy, radius);
  ring.addColorStop(0, 'rgba(255,255,255,0)');
  ring.addColorStop(0.72, 'rgba(255,255,255,0)');
  ring.addColorStop(0.9, 'rgba(255,255,255,0.04)');
  ring.addColorStop(1, 'rgba(255,255,255,0.10)');
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, width, height);
}
