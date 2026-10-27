# Why
Нужна отдельная чистая демонстрация официального Pi Stable без стороннего стека и без изменения текущей сборки или авторизации.

# What Changes
- Операционная установка exact npm latest Stable в отдельный prefix, собственные HOME, agent directory и workspace.
- Отдельная команда pi-demo, очищающая унаследованное окружение; штатные встроенные extensions остаются включены.
- Документация запуска, расширения, границ изоляции и проверок без model requests.

# Capabilities
## New Capabilities
Нет. skip_specs: true: отдельная tooling/demo установка, поведение и контракты сборки не меняются.
## Modified Capabilities
Нет. Соблюдаются build-governance и build-validation.

# Impact
Только docs и OpenSpec evidence в Git; runtime, npm dependencies, auth и логи остаются вне Git. Текущие global Pi, SDK, configs, credentials, Canary и blocked SSH задача вне scope. Никаких платных/live provider probes.
