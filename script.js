const DB_NAME = 'PersonalBlogDB';
const DB_VERSION = 2;
const STORE_USERS = 'users';
const STORE_POSTS = 'posts';
const STORE_COMMENTS = 'comments';
const STORE_CONFIG = 'config';
const SESSION_USER_KEY = 'blogCurrentUser';

const authButton = document.getElementById('authButton');
const authPage = document.getElementById('authPage');
const authClosePage = document.getElementById('authClosePage');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginButton = document.getElementById('backToLogin');
const authMessage = document.getElementById('authMessage');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const resetEmail = document.getElementById('resetEmail');
const resetPassword = document.getElementById('resetPassword');
const resetConfirmPassword = document.getElementById('resetConfirmPassword');
const accountSection = document.getElementById('account');
const adminControls = document.getElementById('adminControls');
const logoutButton = document.getElementById('logoutButton');
const profileLabel = document.getElementById('profileLabel');
const profileHint = document.getElementById('profileHint');
const postAdminList = document.getElementById('postAdminList');
const newPostButton = document.getElementById('newPostButton');
const postEditorForm = document.getElementById('postEditorForm');
const postEditorTitle = document.getElementById('postEditorTitle');
const postEditorExcerpt = document.getElementById('postEditorExcerpt');
const postEditorBody = document.getElementById('postEditorBody');
const postEditorImageFile = document.getElementById('postEditorImageFile');
const postEditorImage = document.getElementById('postEditorImage');
const postEditorPreview = document.getElementById('postEditorPreview');
const postEditorLink = document.getElementById('postEditorLink');
const siteConfigForm = document.getElementById('siteConfigForm');
const postsGrid = document.getElementById('postsGrid');
const postDetailSection = document.getElementById('postDetail');
const detailCloseButton = document.getElementById('detailCloseButton');
const detailInner = document.getElementById('detailInner');
const siteLogo = document.getElementById('siteLogo');
const heroTitle = document.getElementById('heroTitle');
const heroText = document.getElementById('heroText');
const heroSubtext = document.getElementById('heroSubtext');
const heroFooter = document.getElementById('heroFooter');
const aboutText1 = document.getElementById('aboutText1');
const aboutText2 = document.getElementById('aboutText2');
const aboutList = document.getElementById('aboutList');
const contactEmail = document.getElementById('contactEmail');
const contactNote = document.getElementById('contactNote');
const siteHeroTitle = document.getElementById('siteHeroTitle');
const siteHeroText = document.getElementById('siteHeroText');
const siteHeroSubtext = document.getElementById('siteHeroSubtext');
const siteHeroFooter = document.getElementById('siteHeroFooter');
const siteAboutText1 = document.getElementById('siteAboutText1');
const siteAboutText2 = document.getElementById('siteAboutText2');
const siteAboutList = document.getElementById('siteAboutList');
const siteContactEmail = document.getElementById('siteContactEmail');
const siteContactNote = document.getElementById('siteContactNote');

let db = null;
let currentUser = null;
let editingPostId = null;
let selectedImageDataURL = null;

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToBase64(hashBuffer);
}

function validateEmail(email) {
  const pattern = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i;
  return pattern.test(email.trim());
}

function validatePassword(password) {
  return password.length >= 8 && /[A-ZА-ЯЁ]/.test(password) && /[a-zа-яё]/.test(password) && /\d/.test(password) && /[^A-Za-zА-Яа-яё0-9]/.test(password);
}

function showAuthMessage(text, isError = false) {
  authMessage.textContent = text;
  authMessage.style.color = isError ? '#ff7b7b' : '#c7d5ff';
}

function clearAuthMessage() {
  authMessage.textContent = '';
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_USERS)) {
        database.createObjectStore(STORE_USERS, { keyPath: 'username' });
      }
      if (!database.objectStoreNames.contains(STORE_POSTS)) {
        const postsStore = database.createObjectStore(STORE_POSTS, { keyPath: 'id' });
        postsStore.createIndex('dateIso', 'dateIso');
      }
      if (!database.objectStoreNames.contains(STORE_COMMENTS)) {
        database.createObjectStore(STORE_COMMENTS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_CONFIG)) {
        database.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => console.warn('IndexedDB upgrade blocked: close other tabs with this site.');
  });
}

function transaction(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function getItem(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = transaction(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = transaction(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putItem(storeName, value) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteItem(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function initDB() {
  db = await openDB();
  const adminUser = await getItem(STORE_USERS, 'admin@blog.com');
  if (!adminUser) {
    const passwordHash = await hashPassword('Blog2026!');
    await putItem(STORE_USERS, {
      username: 'admin@blog.com',
      name: 'Администратор',
      role: 'admin',
      passwordHash,
      createdAt: new Date().toISOString()
    });
  }

  const heroTitleConfig = await getItem(STORE_CONFIG, 'heroTitle');
  if (!heroTitleConfig) {
    const config = [
      { key: 'siteTitle', value: 'Мой блог' },
      { key: 'heroTitle', value: 'Истории, мысли и вдохновение' },
      { key: 'heroText', value: 'Тебя ждут атмосферные посты о путешествиях, креативе и жизни так, как она есть.' },
      { key: 'heroSubtext', value: 'Новые публикации, красивые истории и идеи для души.' },
      { key: 'heroFooter', value: 'Вдохновение здесь, чтобы вы могли вернуться снова и снова.' },
      { key: 'aboutText1', value: 'Я люблю исследовать новые идеи и делиться тем, что помогает мне жить осознанно. На страницах этого блога вы найдёте статьи о продуктивности, путешествиях, кино и творческих проектах.' },
      { key: 'aboutText2', value: 'Моё желание — делать простые темы понятными и вдохновлять на шаги к новым достижениям.' },
      { key: 'aboutList', value: 'Лайфхаки креативного планирования\nИстории из путешествий\nЗаметки о саморазвитии' },
      { key: 'contactEmail', value: '0709211822a@gmail.com' },
      { key: 'contactNote', value: 'Или следите за обновлениями в социальных сетях.' }
    ];
    await Promise.all(config.map(item => putItem(STORE_CONFIG, item)));
  }

  const posts = await getAll(STORE_POSTS);
  if (!posts.length) {
    const defaultPosts = [
      {
        id: 'post-1',
        dateIso: '2026-04-05',
        title: 'Как найти время для важных целей',
        excerpt: 'Практические советы о том, как планировать день, сохранять концентрацию и реализовать свои мечты.',
        body: 'В этой статье вы найдёте простые приемы, которые помогут выстроить утренний ритуал, ввести привычку ежедневного контроля времени и выделять пространство для важных задач.',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
        link: '#'
      },
      {
        id: 'post-2',
        dateIso: '2026-03-28',
        title: 'Путешествие в город, который вдохновляет',
        excerpt: 'Рассказ о прогулке по любимым улицам, уютных кафе и необычных местах, которые стоит увидеть.',
        body: 'Я рассказываю о том, как небольшой город перезаряжает творческое мышление, в чем фишки местной кухни и какие маршруты стоит планировать в первую очередь.',
        image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
        link: '#'
      },
      {
        id: 'post-3',
        dateIso: '2026-03-14',
        title: 'Как начать писать блог и не сдаваться',
        excerpt: 'Мои правила создания контента, которые помогают оставаться мотивированным и создавать полезные материалы.',
        body: 'Здесь я делюсь тем, как выбрать тему, проводить быстрый ресерч и публиковать посты с пользой для читателя, даже если времени немного.',
        image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
        link: '#'
      }
    ];
    await Promise.all(defaultPosts.map(post => putItem(STORE_POSTS, post)));
  }
}

function formatDate(dateIso) {
  const date = new Date(dateIso);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function loadConfigValue(key) {
  const config = await getItem(STORE_CONFIG, key);
  return config ? config.value : '';
}

async function saveConfigValue(key, value) {
  await putItem(STORE_CONFIG, { key, value });
}

async function renderSite() {
  const [siteTitleConfig, heroTitleConfig, heroTextConfig, heroSubtextConfig, heroFooterConfig,
    aboutText1Config, aboutText2Config, aboutListConfig, contactEmailConfig, contactNoteConfig] = await Promise.all([
      loadConfigValue('siteTitle'),
      loadConfigValue('heroTitle'),
      loadConfigValue('heroText'),
      loadConfigValue('heroSubtext'),
      loadConfigValue('heroFooter'),
      loadConfigValue('aboutText1'),
      loadConfigValue('aboutText2'),
      loadConfigValue('aboutList'),
      loadConfigValue('contactEmail'),
      loadConfigValue('contactNote')
    ]);

  document.title = siteTitleConfig || 'Личный блог';
  siteLogo.textContent = siteTitleConfig || 'Мой блог';
  heroTitle.textContent = heroTitleConfig || heroTitle.textContent;
  heroText.textContent = heroTextConfig || heroText.textContent;
  heroSubtext.textContent = heroSubtextConfig || heroSubtext.textContent;
  heroFooter.textContent = heroFooterConfig || heroFooter.textContent;
  aboutText1.textContent = aboutText1Config || aboutText1.textContent;
  aboutText2.textContent = aboutText2Config || aboutText2.textContent;
  aboutList.innerHTML = (aboutListConfig || '')
    .split('\n')
    .filter(item => item.trim())
    .map(item => `<li>${item}</li>`)
    .join('') || '<li>Здесь появятся ваши ключевые темы.</li>';
  const email = contactEmailConfig || 'hello@example.com';
  contactEmail.href = `mailto:${email}`;
  contactEmail.textContent = email;
  contactNote.textContent = contactNoteConfig || contactNote.textContent;
}

async function renderPosts() {
  const posts = await getAll(STORE_POSTS);
  posts.sort((a, b) => new Date(b.dateIso) - new Date(a.dateIso));
  postsGrid.innerHTML = '';

  if (!posts.length) {
    postsGrid.innerHTML = '<p class="admin-message">Пока нет публикаций. Добавьте пост через админ-панель.</p>';
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.innerHTML = `
      ${post.image ? `<img class="post-image" src="${post.image}" alt="${post.title}" />` : ''}
      <p class="post-date">${formatDate(post.dateIso)}</p>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <div class="post-card-actions">
        <button class="button button-secondary read-post" data-id="${post.id}">Подробнее</button>
        ${currentUser?.role === 'admin' ? `<button class="button button-secondary edit-post" data-id="${post.id}">Редактировать</button>` : ''}
      </div>
    `;
    postsGrid.appendChild(card);
  });

  document.querySelectorAll('.read-post').forEach(button => {
    button.addEventListener('click', () => openPostDetail(button.dataset.id));
  });
  document.querySelectorAll('.edit-post').forEach(button => {
    button.addEventListener('click', () => openEditor(button.dataset.id));
  });
}

async function renderAccountArea() {
  const isLoggedIn = Boolean(currentUser);
  authButton.textContent = isLoggedIn ? 'Профиль' : 'Войти / Регистрация';
  accountSection.classList.toggle('hidden', !isLoggedIn);
  adminControls.classList.toggle('hidden', currentUser?.role !== 'admin');

  if (isLoggedIn) {
    profileLabel.textContent = currentUser.role === 'admin'
      ? `Вы вошли как Администратор (${currentUser.name || currentUser.username})`
      : `Вы вошли как ${currentUser.name || currentUser.username}`;
    profileHint.textContent = currentUser.role === 'admin'
      ? 'Вы можете редактировать посты, добавлять изображения и настраивать сайт.'
      : 'Теперь вы можете оставлять комментарии к постам.';
    if (currentUser.role === 'admin') {
      await renderAdminPosts();
      await renderSiteConfigForm();
    }
  }
}

function openAuthPage(defaultView = 'login') {
  authPage.classList.remove('hidden');
  accountSection.classList.add('hidden');
  setAuthView(defaultView);
  clearAuthMessage();
}

function hideAuthPage() {
  authPage.classList.add('hidden');
}

function setAuthView(view) {
  authTabs.forEach(tab => {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle('active', isActive);
  });
  loginForm.classList.toggle('hidden', view !== 'login');
  loginForm.classList.toggle('active-form', view === 'login');
  registerForm.classList.toggle('hidden', view !== 'register');
  registerForm.classList.toggle('active-form', view === 'register');
  resetForm.classList.toggle('hidden', view !== 'reset');
  resetForm.classList.toggle('active-form', view === 'reset');
}

function clearAuthInputs() {
  loginEmail.value = '';
  loginPassword.value = '';
  registerName.value = '';
  registerEmail.value = '';
  registerPassword.value = '';
  registerConfirmPassword.value = '';
  resetEmail.value = '';
  resetPassword.value = '';
  resetConfirmPassword.value = '';
}

async function restoreSession() {
  const username = sessionStorage.getItem(SESSION_USER_KEY);
  if (!username) return;
  const user = await getItem(STORE_USERS, username);
  if (user) {
    currentUser = user;
  } else {
    sessionStorage.removeItem(SESSION_USER_KEY);
  }
}

async function loginUser(email, password) {
  if (!validateEmail(email)) {
    showAuthMessage('Введите корректный Email.', true);
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getItem(STORE_USERS, normalizedEmail);
  if (!user) {
    showAuthMessage('Пользователь не найден.', true);
    return;
  }
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    showAuthMessage('Неверный пароль.', true);
    return;
  }

  currentUser = user;
  sessionStorage.setItem(SESSION_USER_KEY, normalizedEmail);
  showAuthMessage(`Вы вошли как ${user.role === 'admin' ? 'администратор' : 'пользователь'} ${user.name || user.username}.`);
  await renderAccountArea();
  await renderPosts();
  hideAuthPage();
}

async function registerUser(name, email, password, confirmPassword) {
  if (!name.trim() || !validateEmail(email) || !password || !confirmPassword) {
    showAuthMessage('Заполните все поля корректно.', true);
    return;
  }
  if (password !== confirmPassword) {
    showAuthMessage('Пароли не совпадают.', true);
    return;
  }
  if (!validatePassword(password)) {
    showAuthMessage('Пароль должен содержать 8+ символов, цифру, заглавную букву и специальный символ.', true);
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await getItem(STORE_USERS, normalizedEmail);
  if (existingUser) {
    showAuthMessage('Пользователь с таким Email уже зарегистрирован.', true);
    return;
  }

  const passwordHash = await hashPassword(password);
  await putItem(STORE_USERS, {
    username: normalizedEmail,
    name: name.trim(),
    role: 'user',
    passwordHash,
    createdAt: new Date().toISOString()
  });

  showAuthMessage('Регистрация прошла успешно. Вход выполнен.');
  await loginUser(normalizedEmail, password);
}

async function resetUserPassword(email, password, confirmPassword) {
  if (!validateEmail(email)) {
    showAuthMessage('Введите корректный Email.', true);
    return;
  }
  if (password !== confirmPassword) {
    showAuthMessage('Пароли не совпадают.', true);
    return;
  }
  if (!validatePassword(password)) {
    showAuthMessage('Пароль должен содержать 8+ символов, цифру, заглавную букву и специальный символ.', true);
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await getItem(STORE_USERS, normalizedEmail);
  if (!user) {
    showAuthMessage('Пользователь не найден.', true);
    return;
  }

  user.passwordHash = await hashPassword(password);
  await putItem(STORE_USERS, user);
  showAuthMessage('Пароль успешно обновлён. Войдите с новым паролем.');
  clearAuthInputs();
  setAuthView('login');
}

async function logout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_USER_KEY);
  accountSection.classList.add('hidden');
  await renderAccountArea();
  await renderPosts();
  showAuthMessage('Вы вышли из аккаунта.');
  openAuthPage('login');
}

async function renderAdminPosts() {
  const posts = await getAll(STORE_POSTS);
  posts.sort((a, b) => new Date(b.dateIso) - new Date(a.dateIso));
  postAdminList.innerHTML = '';
  if (!posts.length) {
    postAdminList.innerHTML = '<p class="admin-message">Нет постов для редактирования.</p>';
    return;
  }

  posts.forEach(post => {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <strong>${post.title}</strong>
      <p>${post.excerpt}</p>
      <div class="admin-item-actions">
        <button class="button button-secondary edit-post" data-id="${post.id}">Редактировать</button>
        <button class="button button-secondary delete-post" data-id="${post.id}">Удалить</button>
      </div>
    `;
    postAdminList.appendChild(item);
  });

  document.querySelectorAll('.edit-post').forEach(button => {
    button.addEventListener('click', () => openEditor(button.dataset.id));
  });
  document.querySelectorAll('.delete-post').forEach(button => {
    button.addEventListener('click', () => removePost(button.dataset.id));
  });
}

async function renderSiteConfigForm() {
  siteHeroTitle.value = await loadConfigValue('heroTitle');
  siteHeroText.value = await loadConfigValue('heroText');
  siteHeroSubtext.value = await loadConfigValue('heroSubtext');
  siteHeroFooter.value = await loadConfigValue('heroFooter');
  siteAboutText1.value = await loadConfigValue('aboutText1');
  siteAboutText2.value = await loadConfigValue('aboutText2');
  siteAboutList.value = await loadConfigValue('aboutList');
  siteContactEmail.value = await loadConfigValue('contactEmail');
  siteContactNote.value = await loadConfigValue('contactNote');
}

function clearEditor() {
  editingPostId = null;
  selectedImageDataURL = null;
  postEditorPreview.src = '';
  postEditorPreview.classList.add('hidden');
  if (postEditorImageFile) {
    postEditorImageFile.value = '';
  }
}

function openEditor(postId = null) {
  editingPostId = postId;
  postEditorForm.classList.remove('hidden');
  if (!postId) {
    clearEditor();
    postEditorTitle.value = '';
    postEditorExcerpt.value = '';
    postEditorBody.value = '';
    postEditorImage.value = '';
    postEditorLink.value = '';
    return;
  }
  getItem(STORE_POSTS, postId).then(post => {
    if (!post) return;
    postEditorTitle.value = post.title;
    postEditorExcerpt.value = post.excerpt;
    postEditorBody.value = post.body;
    postEditorImage.value = post.image || '';
    postEditorLink.value = post.link || '';
    if (post.image) {
      postEditorPreview.src = post.image;
      postEditorPreview.classList.remove('hidden');
      selectedImageDataURL = post.image;
    } else {
      postEditorPreview.classList.add('hidden');
    }
  });
}

function handleImageUpload() {
  const file = postEditorImageFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    selectedImageDataURL = reader.result;
    postEditorPreview.src = reader.result;
    postEditorPreview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function savePost(event) {
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'admin') {
    showAuthMessage('Только администратор может сохранять посты.', true);
    return;
  }

  const title = postEditorTitle.value.trim();
  const excerpt = postEditorExcerpt.value.trim();
  const body = postEditorBody.value.trim();
  const image = selectedImageDataURL || postEditorImage.value.trim();
  const link = postEditorLink.value.trim() || '#';

  if (!title || !excerpt || !body) {
    showAuthMessage('Заполните заголовок, описание и текст поста.', true);
    return;
  }

  const post = {
    id: editingPostId || `post-${Date.now()}`,
    dateIso: editingPostId ? (await getItem(STORE_POSTS, editingPostId)).dateIso : new Date().toISOString().split('T')[0],
    title,
    excerpt,
    body,
    image,
    link
  };

  await putItem(STORE_POSTS, post);
  await renderPosts();
  await renderAdminPosts();
  showAuthMessage(editingPostId ? 'Пост обновлён.' : 'Пост опубликован.');
  clearEditor();
  postEditorForm.classList.add('hidden');
}

async function removePost(postId) {
  const confirmed = confirm('Удалить этот пост?');
  if (!confirmed) return;
  await deleteItem(STORE_POSTS, postId);
  await renderPosts();
  await renderAdminPosts();
  showAuthMessage('Пост удалён.');
}

async function saveSiteConfig(event) {
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'admin') {
    showAuthMessage('Только администратор может изменять сайт.', true);
    return;
  }

  await saveConfigValue('heroTitle', siteHeroTitle.value.trim());
  await saveConfigValue('heroText', siteHeroText.value.trim());
  await saveConfigValue('heroSubtext', siteHeroSubtext.value.trim());
  await saveConfigValue('heroFooter', siteHeroFooter.value.trim());
  await saveConfigValue('aboutText1', siteAboutText1.value.trim());
  await saveConfigValue('aboutText2', siteAboutText2.value.trim());
  await saveConfigValue('aboutList', siteAboutList.value.trim());
  await saveConfigValue('contactEmail', siteContactEmail.value.trim());
  await saveConfigValue('contactNote', siteContactNote.value.trim());
  showAuthMessage('Содержимое сайта обновлено.');
  await renderSite();
}

async function openPostDetail(postId) {
  const post = await getItem(STORE_POSTS, postId);
  if (!post) return;
  detailInner.innerHTML = `
    ${post.image ? `<img class="post-image" src="${post.image}" alt="${post.title}" />` : ''}
    <p class="post-date">${formatDate(post.dateIso)}</p>
    <h2>${post.title}</h2>
    <p>${post.body}</p>
    <div class="post-detail-actions">
      ${currentUser?.role === 'admin' ? `<button id="detailEditButton" class="button button-secondary">Редактировать</button>` : ''}
    </div>
    <section class="comment-block">
      <h3>Комментарии</h3>
      <div id="commentList"></div>
      <form id="commentForm" class="comment-form">
        <label class="field">
          <span>Добавить комментарий</span>
          <textarea id="commentText" rows="4" placeholder="Ваш комментарий" required></textarea>
        </label>
        <button class="button" type="submit">Отправить</button>
      </form>
      <p id="commentStatus" class="admin-message"></p>
    </section>
  `;

  postDetailSection.classList.remove('hidden');
  renderComments(postId);

  const commentForm = document.getElementById('commentForm');
  const commentStatus = document.getElementById('commentStatus');
  const commentText = document.getElementById('commentText');

  if (!currentUser) {
    commentForm.innerHTML = '<p class="admin-message">Войдите, чтобы оставлять комментарии.</p>';
  } else {
    commentForm.onsubmit = async event => {
      event.preventDefault();
      const text = commentText.value.trim();
      if (!text) {
        commentStatus.textContent = 'Введите комментарий.';
        return;
      }
      await putItem(STORE_COMMENTS, {
        id: `comment-${Date.now()}`,
        postId,
        username: currentUser.username,
        author: currentUser.name || currentUser.username,
        text,
        createdAt: new Date().toISOString()
      });
      commentText.value = '';
      commentStatus.textContent = 'Комментарий добавлен.';
      await renderComments(postId);
    };
  }

  const detailEditButton = document.getElementById('detailEditButton');
  if (detailEditButton) {
    detailEditButton.addEventListener('click', () => {
      openEditor(postId);
      closeDetail();
    });
  }
}

async function renderComments(postId) {
  const comments = await getAll(STORE_COMMENTS);
  const postComments = comments
    .filter(comment => comment.postId === postId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const commentList = document.getElementById('commentList');
  if (!commentList) return;
  commentList.innerHTML = postComments.length
    ? postComments.map(comment => `
        <div class="comment-card">
          <strong>${comment.author}</strong>
          <p>${comment.text}</p>
          <p class="post-date">${new Date(comment.createdAt).toLocaleString('ru-RU')}</p>
        </div>
      `).join('')
    : '<p class="admin-message">Пока нет комментариев. Станьте первым!</p>';
}

function handleAuthTabClick(event) {
  const view = event.currentTarget.dataset.view;
  setAuthView(view);
  clearAuthMessage();
}

function closeDetail() {
  postDetailSection.classList.add('hidden');
  detailInner.innerHTML = '';
}

function init() {
  initDB()
    .then(() => restoreSession())
    .then(() => renderSite())
    .then(() => renderPosts())
    .then(() => renderAccountArea())
    .catch(error => console.error('Ошибка инициализации приложения:', error));

  authButton.addEventListener('click', () => {
    if (currentUser) {
      accountSection.classList.toggle('hidden');
      hideAuthPage();
      if (!accountSection.classList.contains('hidden')) {
        accountSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      openAuthPage('login');
    }
  });
  authClosePage.addEventListener('click', () => hideAuthPage());
  authTabs.forEach(tab => tab.addEventListener('click', handleAuthTabClick));
  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    loginUser(loginEmail.value.trim(), loginPassword.value);
  });
  registerForm.addEventListener('submit', event => {
    event.preventDefault();
    registerUser(registerName.value.trim(), registerEmail.value.trim(), registerPassword.value, registerConfirmPassword.value);
  });
  resetForm.addEventListener('submit', event => {
    event.preventDefault();
    resetUserPassword(resetEmail.value.trim(), resetPassword.value, resetConfirmPassword.value);
  });
  forgotPasswordLink.addEventListener('click', () => {
    setAuthView('reset');
    clearAuthMessage();
  });
  backToLoginButton.addEventListener('click', () => {
    setAuthView('login');
    clearAuthInputs();
    clearAuthMessage();
  });
  logoutButton.addEventListener('click', logout);
  newPostButton.addEventListener('click', () => openEditor());
  postEditorForm.addEventListener('submit', savePost);
  postEditorImageFile.addEventListener('change', handleImageUpload);
  siteConfigForm.addEventListener('submit', saveSiteConfig);
  detailCloseButton.addEventListener('click', closeDetail);
  postDetailSection.addEventListener('click', event => {
    if (event.target === postDetailSection) closeDetail();
  });
}

// Google Sign-In handlers
function handleGoogleSignIn(response) {
  // Decode the JWT token
  const responsePayload = decodeJwtResponse(response.credential);
  console.log("Google Sign-In successful:", responsePayload);

  // Use email as username
  const email = responsePayload.email;
  const name = responsePayload.name || responsePayload.email;

  // Check if user exists, if not, create as user
  getItem(STORE_USERS, email).then(existingUser => {
    if (existingUser) {
      currentUser = existingUser;
      sessionStorage.setItem(SESSION_USER_KEY, email);
      showAuthMessage(`Вы вошли через Google как ${existingUser.role === 'admin' ? 'администратор' : 'пользователь'} ${existingUser.name || existingUser.username}.`);
      renderAccountArea();
      renderPosts();
      hideAuthPage();
    } else {
      // Create new user
      putItem(STORE_USERS, {
        username: email,
        name: name,
        role: 'user',
        passwordHash: '', // No password for Google users
        createdAt: new Date().toISOString()
      }).then(() => {
        currentUser = { username: email, name: name, role: 'user' };
        sessionStorage.setItem(SESSION_USER_KEY, email);
        showAuthMessage(`Регистрация через Google успешна. Вы вошли как ${name}.`);
        renderAccountArea();
        renderPosts();
        hideAuthPage();
      });
    }
  }).catch(error => {
    console.error("Error handling Google Sign-In:", error);
    showAuthMessage('Ошибка входа через Google.', true);
  });
}

function handleGoogleSignUp(response) {
  // For signup, treat as new user
  const responsePayload = decodeJwtResponse(response.credential);
  console.log("Google Sign-Up successful:", responsePayload);

  const email = responsePayload.email;
  const name = responsePayload.name || responsePayload.email;

  // Check if user exists
  getItem(STORE_USERS, email).then(existingUser => {
    if (existingUser) {
      showAuthMessage('Пользователь с таким Email уже зарегистрирован.', true);
    } else {
      putItem(STORE_USERS, {
        username: email,
        name: name,
        role: 'user',
        passwordHash: '',
        createdAt: new Date().toISOString()
      }).then(() => {
        currentUser = { username: email, name: name, role: 'user' };
        sessionStorage.setItem(SESSION_USER_KEY, email);
        showAuthMessage(`Регистрация через Google успешна. Вы вошли как ${name}.`);
        renderAccountArea();
        renderPosts();
        hideAuthPage();
      });
    }
  }).catch(error => {
    console.error("Error handling Google Sign-Up:", error);
    showAuthMessage('Ошибка регистрации через Google.', true);
  });
}

function decodeJwtResponse(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

init();
