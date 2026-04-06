# Личный блог

Это статический сайт на HTML/CSS/JavaScript. Для публикации проекта достаточно разместить файлы `index.html`, `styles.css` и `script.js` на любом статическом хостинге.

## Настройка входа через Google

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/).
2. Создайте новый проект или выберите существующий.
3. Включите Google Identity API.
4. Создайте OAuth 2.0 Client ID:
   - Тип: Web application
   - Authorized JavaScript origins: добавьте ваш домен (например, `https://amanbekkkkk.github.io`)
   - Authorized redirect URIs: добавьте `https://amanbekkkkk.github.io/my-blog-kimo/` (или ваш URL)
5. Скопируйте Client ID.
6. В файле `index.html` замените `YOUR_GOOGLE_CLIENT_ID` на ваш Client ID.

## Как выложить на GitHub Pages

1. Создайте новый репозиторий на GitHub.
2. Скопируйте сюда все файлы проекта:
   - `index.html`
   - `styles.css`
   - `script.js`
3. Инициализируйте git и сделайте первый коммит:

```bash
git init
git add .
git commit -m "Первый коммит: личный блог"
git branch -M main
git remote add origin https://github.com/<ваш_пользователь>/<имя_репозитория>.git
git push -u origin main
```

4. В настройках репозитория (Settings) откройте раздел **Pages**.
5. Выберите ветку `main` и папку `/root`.
6. Сохраните и дождитесь публикации.

После этого сайт будет доступен по адресу `https://<ваш_пользователь>.github.io/<имя_репозитория>`.

## Как выложить на Netlify или Vercel

- Netlify: перетащите папку с проектом на сайт Netlify или подключите репозиторий.
- Vercel: создайте новый проект и выберите репозиторий. В настройках укажите, что это статический сайт.

## Что важно

- Сейчас данные пользователей, постов и комментариев сохраняются в браузере пользователя через IndexedDB.
- Это значит, что другие люди не будут видеть ваши изменения, пока сайт не станет серверным.
- Если хотите, чтобы все пользователи видели одни и те же посты и комментарии, нужно добавить сервер и базу данных.

## Быстрый запуск локально

Откройте `index.html` в браузере или используйте простой HTTP-сервер, например:

```bash
python3 -m http.server 8000
```

и откройте http://localhost:8000
