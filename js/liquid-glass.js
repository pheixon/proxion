// Refraction technique adapted from github.com/deepika-builds/liquid-glass (MIT)
(() => {
  if (!navigator.userAgentData) return;

  const NS = 'http://www.w3.org/2000/svg';
  const CHANNELS = [
    '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0',
    '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0',
    '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0',
  ];
  const maps = new Map();
  const filters = new Map();
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 0);
  svg.setAttribute('height', 0);
  svg.style.position = 'absolute';
  document.body.appendChild(svg);

  const makeMap = (w, h, r) => {
    const key = `${w}x${h}x${r}`;
    if (maps.has(key)) return maps.get(key);
    const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d');
    const gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, '#000');
    gx.addColorStop(1, '#f00');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);
    const gy = ctx.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, '#000');
    gy.addColorStop(1, '#00f');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, w, h);
    const min = Math.min(w, h);
    const inset = min * 0.07;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = `blur(${min * 0.15}px)`;
    ctx.fillStyle = 'rgba(128, 128, 128, 0.93)';
    ctx.beginPath();
    ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, Math.max(r - inset, 2));
    ctx.fill();
    const url = ctx.canvas.toDataURL();
    maps.set(key, url);
    return url;
  };

  const render = el => {
    if (document.documentElement.dataset.theme !== 'liquid-glass') return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return;
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
    const scale = -Math.min(w, h) * 1.2;
    let filter = filters.get(el);
    if (!filter) {
      filter = document.createElementNS(NS, 'filter');
      filter.id = 'lg-' + filters.size;
      Object.entries({ x: 0, y: 0, width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' })
        .forEach(([k, v]) => filter.setAttribute(k, v));
      svg.appendChild(filter);
      filters.set(el, filter);
      el.style.setProperty('--lg', `url(#${filter.id}) blur(2px)`);
    }
    filter.innerHTML = `
      <feFlood flood-color="rgb(128, 128, 128)" result="flood"/>
      <feImage href="${makeMap(w, h, r)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="img"/>
      <feComposite in="img" in2="flood" operator="over" result="map"/>
      ${CHANNELS.map((m, i) => `
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale + i * 6}" xChannelSelector="R" yChannelSelector="B" result="d${i}"/>
        <feColorMatrix in="d${i}" type="matrix" values="${m}" result="c${i}"/>`).join('')}
      <feBlend in="c0" in2="c1" mode="screen" result="c01"/>
      <feBlend in="c01" in2="c2" mode="screen"/>`;
  };

  const els = document.querySelectorAll('.item .button, .item .label, .bottom-btn, .global-search-input');
  const pending = new Set();
  let frame = 0;
  const schedule = list => {
    list.forEach(el => pending.add(el));
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      pending.forEach(render);
      pending.clear();
    });
  };

  const ro = new ResizeObserver(entries => schedule(entries.map(e => e.target)));
  els.forEach(el => ro.observe(el));
  new MutationObserver(() => schedule(els)).observe(document.documentElement, { attributeFilter: ['data-theme'] });
})();
