/* ═══════════════════════════════════════════════════════════
   QR FORGE v2.2 — Lógica
   ═══════════════════════════════════════════════════════════ */

const container = document.getElementById('qrContainer');
const statusEl = document.getElementById('status');
const toastContainer = document.getElementById('toastContainer');

let currentTab = 'url';
let logoImage = null;

let config = {
  dotsShape: 'square',
  cornerSquareShape: 'square',
  cornerDotShape: 'square',
  bgColor: '#ffffff',
  dotsColor: '#1c1917',
  cornerSquareColor: '#1c1917',
  cornerDotColor: '#1c1917',
  margin: 10,
  logoSize: 25,
  ecc: 'H',
  exportSize: 1024,
  gradientEnabled: false,
  gradientType: 'linear',
  gradientRotation: 45,
  gradientColorA: '#ff6b1a',
  gradientColorB: '#ff2e88'
};

let qrCode = null;

/* ═══════════════════════════════════════════════════════════
   TEMA OSCURO
   ═══════════════════════════════════════════════════════════ */
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('qrforge-theme') || 'light';
if(savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  if(next === 'light'){
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', next);
  }
  localStorage.setItem('qrforge-theme', next);
});

/* ═══════════════════════════════════════════════════════════
   INICIALIZAR
   ═══════════════════════════════════════════════════════════ */
function initQR(){
  if(typeof QRCodeStyling === 'undefined'){
    showError('No se encontró qr-code-styling.js. Verifica que esté en la misma carpeta.');
    return;
  }

  qrCode = new QRCodeStyling({
    width: 320,
    height: 320,
    type: 'canvas',
    data: 'placeholder',
    margin: config.margin,
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 6,
      imageSize: config.logoSize / 100,
      hideBackgroundDots: true
    },
    qrOptions: { errorCorrectionLevel: config.ecc },
    dotsOptions: { color: config.dotsColor, type: config.dotsShape },
    backgroundOptions: { color: config.bgColor },
    cornersSquareOptions: { color: config.cornerSquareColor, type: config.cornerSquareShape },
    cornersDotOptions: { color: config.cornerDotColor, type: config.cornerDotShape }
  });

  qrCode.append(container);
}

/* ═══════════════════════════════════════════════════════════
   OPCIONES DE PUNTOS (con/sin gradiente)
   ═══════════════════════════════════════════════════════════ */
function getDotsOptions(){
  const base = { type: config.dotsShape };
  if(config.gradientEnabled){
    return {
      ...base,
      gradient: {
        type: config.gradientType,
        rotation: (config.gradientRotation * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: config.gradientColorA },
          { offset: 1, color: config.gradientColorB }
        ]
      }
    };
  }
  return { ...base, color: config.dotsColor };
}

/* ═══════════════════════════════════════════════════════════
   ACTUALIZAR QR
   ═══════════════════════════════════════════════════════════ */
let updateTimer = null;
function updateQR(){
  if(!qrCode) return;
  clearTimeout(updateTimer);
  updateTimer = setTimeout(doUpdate, 150);
}

function doUpdate(){
  if(!qrCode) return;

  const content = buildContent();

  if(!content){
    showError('Añade los datos para generar el código');
    return;
  }
  clearStatus();

  if(logoImage && (config.ecc === 'L' || config.ecc === 'M')){
    showWarning('Con logo, se recomienda usar corrección Q o H para que el QR siga siendo legible.');
  }

  qrCode.update({
    data: content,
    margin: config.margin,
    image: logoImage ? logoImage.src : undefined,
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 6,
      imageSize: config.logoSize / 100,
      hideBackgroundDots: true
    },
    qrOptions: { errorCorrectionLevel: config.ecc },
    dotsOptions: getDotsOptions(),
    backgroundOptions: { color: config.bgColor },
    cornersSquareOptions: { color: config.cornerSquareColor, type: config.cornerSquareShape },
    cornersDotOptions: { color: config.cornerDotColor, type: config.cornerDotShape }
  });
}

/* ═══════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    document.querySelector(`[data-content="${currentTab}"]`).classList.add('active');
    updateQR();
  });
});

/* ═══════════════════════════════════════════════════════════
   CONTENIDO SEGÚN TIPO
   ═══════════════════════════════════════════════════════════ */
function buildContent(){
  switch(currentTab){
    case 'url':
      return document.getElementById('urlInput').value.trim() || '';
    case 'wifi': {
      const ssid = document.getElementById('wifiSSID').value.trim();
      const pass = document.getElementById('wifiPass').value;
      const enc = document.getElementById('wifiEnc').value;
      const hidden = document.getElementById('wifiHidden').value;
      if(!ssid) return '';
      const escapeWifi = (s) => s.replace(/([\\;,":])/g, '\\$1');
      return `WIFI:T:${enc};S:${escapeWifi(ssid)};${pass ? 'P:' + escapeWifi(pass) + ';' : ''}H:${hidden};;`;
    }
    case 'vcard': {
      const first = document.getElementById('vcFirst').value.trim();
      const last = document.getElementById('vcLast').value.trim();
      const org = document.getElementById('vcOrg').value.trim();
      const phone = document.getElementById('vcPhone').value.trim();
      const email = document.getElementById('vcEmail').value.trim();
      const web = document.getElementById('vcWeb').value.trim();
      if(!first && !last) return '';
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${last};${first};;;`,
        `FN:${[first, last].filter(Boolean).join(' ')}`
      ];
      if(org) lines.push(`ORG:${org}`);
      if(phone) lines.push(`TEL;TYPE=CELL:${phone}`);
      if(email) lines.push(`EMAIL:${email}`);
      if(web) lines.push(`URL:${web}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }
    case 'email': {
      const to = document.getElementById('emailTo').value.trim();
      const subject = document.getElementById('emailSubject').value.trim();
      const body = document.getElementById('emailBody').value.trim();
      if(!to) return '';
      const params = new URLSearchParams();
      if(subject) params.set('subject', subject);
      if(body) params.set('body', body);
      const qs = params.toString();
      return `mailto:${to}${qs ? '?' + qs : ''}`;
    }
  }
  return '';
}

/* ═══════════════════════════════════════════════════════════
   SHAPE GRIDS
   ═══════════════════════════════════════════════════════════ */
function bindShapeGrid(gridId, configKey){
  const grid = document.getElementById(gridId);
  if(!grid) return;
  grid.querySelectorAll('.shape-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.shape-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      config[configKey] = btn.dataset.shape;
      updateQR();
    });
  });
}
bindShapeGrid('dotsShapeGrid', 'dotsShape');
bindShapeGrid('cornerSquareGrid', 'cornerSquareShape');
bindShapeGrid('cornerDotGrid', 'cornerDotShape');

const gradientTypeGrid = document.getElementById('gradientTypeGrid');
if(gradientTypeGrid){
  gradientTypeGrid.querySelectorAll('.shape-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      gradientTypeGrid.querySelectorAll('.shape-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      config.gradientType = btn.dataset.shape;
      updateGradientPreview();
      updateQR();
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   COLOR PICKERS
   ═══════════════════════════════════════════════════════════ */
function bindColorPicker(colorId, hexId, swatchId, configKey, onChange){
  const colorEl = document.getElementById(colorId);
  const hexEl = document.getElementById(hexId);
  const swatchEl = document.getElementById(swatchId);

  colorEl.addEventListener('input', () => {
    hexEl.value = colorEl.value.toUpperCase();
    swatchEl.style.background = colorEl.value;
    config[configKey] = colorEl.value;
    if(onChange) onChange();
    updateQR();
  });

  hexEl.addEventListener('input', () => {
    let val = hexEl.value.trim();
    if(!val.startsWith('#')) val = '#' + val;
    if(/^#[0-9A-Fa-f]{6}$/.test(val)){
      colorEl.value = val;
      swatchEl.style.background = val;
      config[configKey] = val;
      if(onChange) onChange();
      updateQR();
    }
  });

  hexEl.addEventListener('blur', () => {
    let val = hexEl.value.trim();
    if(!val.startsWith('#')) val = '#' + val;
    if(!/^#[0-9A-Fa-f]{6}$/.test(val)){
      hexEl.value = colorEl.value.toUpperCase();
    } else {
      hexEl.value = val.toUpperCase();
    }
  });
}
bindColorPicker('bgColor', 'bgHex', 'bgSwatch', 'bgColor');
bindColorPicker('dotsColor', 'dotsHex', 'dotsSwatch', 'dotsColor');
bindColorPicker('csColor', 'csHex', 'csSwatch', 'cornerSquareColor');
bindColorPicker('cdColor', 'cdHex', 'cdSwatch', 'cornerDotColor');
bindColorPicker('gradA_Color', 'gradA_Hex', 'gradA_Swatch', 'gradientColorA', updateGradientPreview);
bindColorPicker('gradB_Color', 'gradB_Hex', 'gradB_Swatch', 'gradientColorB', updateGradientPreview);

function updateGradientPreview(){
  const preview = document.getElementById('gradientPreview');
  if(!preview) return;
  if(config.gradientType === 'linear'){
    preview.style.background = `linear-gradient(${config.gradientRotation}deg, ${config.gradientColorA}, ${config.gradientColorB})`;
  } else {
    preview.style.background = `radial-gradient(circle, ${config.gradientColorA}, ${config.gradientColorB})`;
  }
}

/* ═══════════════════════════════════════════════════════════
   TOGGLE GRADIENTE
   ═══════════════════════════════════════════════════════════ */
const gradientToggle = document.getElementById('gradientToggle');
const gradientOptions = document.getElementById('gradientOptions');

gradientToggle.addEventListener('click', () => {
  config.gradientEnabled = !config.gradientEnabled;
  gradientToggle.classList.toggle('on', config.gradientEnabled);
  gradientOptions.style.display = config.gradientEnabled ? 'block' : 'none';
  if(config.gradientEnabled) updateGradientPreview();
  updateQR();
});

/* ═══════════════════════════════════════════════════════════
   SLIDERS
   ═══════════════════════════════════════════════════════════ */
document.getElementById('marginRange').addEventListener('input', (e) => {
  document.getElementById('marginValue').textContent = e.target.value;
  config.margin = parseInt(e.target.value);
  updateQR();
});

document.getElementById('logoSizeRange').addEventListener('input', (e) => {
  document.getElementById('logoSizeValue').textContent = e.target.value + '%';
  config.logoSize = parseInt(e.target.value);
  updateQR();
});

document.getElementById('gradientRotation').addEventListener('input', (e) => {
  document.getElementById('gradientRotationValue').textContent = e.target.value + '°';
  config.gradientRotation = parseInt(e.target.value);
  updateGradientPreview();
  updateQR();
});

document.getElementById('exportSize').addEventListener('input', (e) => {
  document.getElementById('exportSizeValue').textContent = e.target.value + 'px';
  config.exportSize = parseInt(e.target.value);
});

/* ═══════════════════════════════════════════════════════════
   SELECTOR ECC
   ═══════════════════════════════════════════════════════════ */
document.getElementById('eccSelect').addEventListener('change', (e) => {
  config.ecc = e.target.value;
  updateQR();
});

/* ═══════════════════════════════════════════════════════════
   INPUTS
   ═══════════════════════════════════════════════════════════ */
['urlInput','wifiSSID','wifiPass','wifiEnc','wifiHidden',
 'vcFirst','vcLast','vcOrg','vcPhone','vcEmail','vcWeb',
 'emailTo','emailSubject','emailBody'].forEach(id => {
  const el = document.getElementById(id);
  if(el){
    el.addEventListener('input', updateQR);
    el.addEventListener('change', updateQR);
  }
});

/* ═══════════════════════════════════════════════════════════
   LOGO UPLOAD
   ═══════════════════════════════════════════════════════════ */
document.getElementById('logoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 2 * 1024 * 1024){
    showError('La imagen debe pesar menos de 2MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    logoImage = { src: ev.target.result };
    const preview = document.getElementById('logoPreview');
    preview.innerHTML = `<img src="${ev.target.result}" alt="logo">`;
    document.getElementById('logoUpload').classList.add('has-logo');
    document.getElementById('logoPrimary').textContent = file.name;
    document.getElementById('logoSecondary').textContent = (file.size / 1024).toFixed(0) + ' KB';
    document.getElementById('logoClear').style.display = 'grid';
    document.getElementById('logoSizeField').style.display = 'block';

    if(config.ecc === 'L' || config.ecc === 'M'){
      config.ecc = 'H';
      document.getElementById('eccSelect').value = 'H';
      showToast('Corrección ajustada a H automáticamente');
    }

    showToast('Logo añadido');
    updateQR();
  };
  reader.readAsDataURL(file);
});

document.getElementById('logoClear').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  logoImage = null;
  document.getElementById('logoInput').value = '';
  document.getElementById('logoPreview').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  document.getElementById('logoUpload').classList.remove('has-logo');
  document.getElementById('logoPrimary').textContent = 'Subir imagen';
  document.getElementById('logoSecondary').textContent = 'PNG, JPG o SVG · máx 2MB';
  document.getElementById('logoClear').style.display = 'none';
  document.getElementById('logoSizeField').style.display = 'none';
  showToast('Logo eliminado');
  updateQR();
});

/* ═══════════════════════════════════════════════════════════
   DESCARGAS — Instancia temporal con estilo + tamaño
   ═══════════════════════════════════════════════════════════ */
function buildOptionsForExport(size, type){
  const content = buildContent();
  if(!content) return null;

  const opts = {
    width: size,
    height: size,
    type: type || 'canvas',
    data: content,
    margin: config.margin,
    qrOptions: { errorCorrectionLevel: config.ecc },
    dotsOptions: getDotsOptions(),
    backgroundOptions: { color: config.bgColor },
    cornersSquareOptions: { color: config.cornerSquareColor, type: config.cornerSquareShape },
    cornersDotOptions: { color: config.cornerDotColor, type: config.cornerDotShape }
  };

  if(logoImage){
    opts.image = logoImage.src;
    opts.imageOptions = {
      crossOrigin: 'anonymous',
      margin: 6,
      imageSize: config.logoSize / 100,
      hideBackgroundDots: true
    };
  }

  return opts;
}

document.getElementById('btnPng').addEventListener('click', () => {
  const size = config.exportSize;
  const opts = buildOptionsForExport(size, 'canvas');
  if(!opts){ showError('Añade los datos antes de descargar'); return; }

  try{
    const temp = new QRCodeStyling(opts);
    setTimeout(() => {
      temp.download({ name: `qr-${Date.now()}-${size}px`, extension: 'png' });
      showToast(`PNG descargado · ${size}px`);
    }, 100);
  }catch(err){
    showError('Error al descargar PNG: ' + err.message);
  }
});

document.getElementById('btnJpeg').addEventListener('click', () => {
  const size = config.exportSize;
  const opts = buildOptionsForExport(size, 'canvas');
  if(!opts){ showError('Añade los datos antes de descargar'); return; }

  try{
    const temp = new QRCodeStyling(opts);
    setTimeout(() => {
      temp.download({ name: `qr-${Date.now()}-${size}px`, extension: 'jpeg' });
      showToast(`JPEG descargado · ${size}px`);
    }, 100);
  }catch(err){
    showError('Error al descargar JPEG: ' + err.message);
  }
});

document.getElementById('btnSvg').addEventListener('click', () => {
  const opts = buildOptionsForExport(1024, 'svg');
  if(!opts){ showError('Añade los datos antes de descargar'); return; }

  try{
    const temp = new QRCodeStyling(opts);
    setTimeout(() => {
      temp.download({ name: `qr-${Date.now()}`, extension: 'svg' });
      showToast('SVG descargado · vectorial');
    }, 100);
  }catch(err){
    showError('Error al descargar SVG: ' + err.message);
  }
});

/* ═══════════════════════════════════════════════════════════
   STATUS Y TOASTS
   ═══════════════════════════════════════════════════════════ */
function showError(msg){
  statusEl.textContent = msg;
  statusEl.className = 'status show error';
}
function showWarning(msg){
  statusEl.textContent = msg;
  statusEl.className = 'status show warn';
}
function clearStatus(){
  statusEl.className = 'status';
  statusEl.textContent = '';
}
function showToast(msg){
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>${msg}`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initQR();
});