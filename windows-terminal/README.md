# Windows Terminal visual

Переносимый snapshot текущего оформления: Catppuccin Mocha, acrylic 90%, фон 18%, JetBrainsMono Nerd Font и используемые keybindings. Machine-specific profiles, username и absolute host paths исключены.

## Установка

1. Установить **JetBrainsMono Nerd Font**.
2. Скопировать `catppuccin-mocha-blur.jpg` в `%USERPROFILE%\Pictures\Terminal\`.
3. В Windows Terminal открыть **Settings → Open JSON file**, сохранить backup и заменить содержимое файлом `settings.json`.

Snapshot не задаёт `defaultProfile` и список profiles: Windows Terminal сохранит/создаст доступные на новом ПК dynamic profiles. Если нужно сохранить существующие ручные profiles, перенести из snapshot только `profiles.defaults`, `schemes` и `keybindings`.
