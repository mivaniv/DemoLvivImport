#!/bin/bash
# Перехід lvivimport.com з WordPress на новий сайт — запускається в «Терміналі» DirectAdmin.
# Порядок дій і що робити до й після: docs/cutover.md.
#
#   bash cutover.sh check     — лише перевірки, нічого не змінює
#   bash cutover.sh switch    — перемикання: дві зміни назв тек, кілька секунд
#   bash cutover.sh rollback  — повернути WordPress так, як було
#
# Нічого не видаляє. WordPress переїжджає в public_html_wordpress (файли цілі, база не чіпається),
# новий сайт заздалегідь залитий у public_html_new. На місці лишаються дві теки, від яких залежать інші:
#   assets/uploads/wpallimport/files — сюди 1С щоночі заливає вивантаження й фото по FTP;
#   assets/images/video              — відео сторінки «Про нас» (посилання на них уже є на сайті).
# Вони переносяться в новий сайт за тим самим шляхом, тож 1С і відео нічого не помічають.
set -uo pipefail

D="$HOME/domains/lvivimport.com"
LIVE="$D/public_html"
NEW="$D/public_html_new"
OLD="$D/public_html_wordpress"
KEEP=("assets/uploads/wpallimport/files" "assets/images/video")

ok() { echo "  ✓ $*"; }
bad() { echo "  ✗ $*"; FAIL=1; }

check() {
    FAIL=0
    echo "Перевірка перед перемиканням:"
    [ -f "$LIVE/wp-config.php" ] && ok "WordPress працює в public_html" || bad "у public_html немає wp-config.php — перемикання вже було?"
    [ -e "$OLD" ] && bad "тека public_html_wordpress уже існує" || ok "public_html_wordpress ще немає"
    [ -f "$NEW/lvivimport-site.txt" ] && ok "новий сайт у public_html_new (позначка є)" || bad "у public_html_new немає lvivimport-site.txt"
    [ -f "$NEW/index.html" ] && [ -f "$NEW/product/index.html" ] && ok "сторінки нового сайту на місці" || bad "у public_html_new немає index.html / product/index.html — заливка не завершена"
    if [ -f "$NEW/data/catalog-status.json" ] && grep -q '"ok":true' "$NEW/data/catalog-status.json"; then
        # До ранкового крону новий сайт показуватиме саме цей каталог — він має бути свіжим
        AGE=$(( ($(date +%s) - $(stat -c %Y "$NEW/data/catalog-status.json")) / 3600 ))
        if [ "$AGE" -lt 36 ]; then
            ok "каталог зібрано $AGE год тому: $(grep -o '"products":[0-9]*' "$NEW/data/catalog-status.json")"
        else
            bad "каталог у public_html_new зібрано $AGE год тому — оновіть його (docs/cutover.md, «День переходу»)"
        fi
    else
        bad "каталог у public_html_new ще не зібрано (запустіть update-catalog.php, див. docs/cutover.md)"
    fi
    PHOTOS=$(find "$NEW/images_backup" -maxdepth 1 -type f 2>/dev/null | wc -l)
    [ "$PHOTOS" -gt 1000 ] && ok "фото нового сайту: $PHOTOS" || bad "фото нового сайту: $PHOTOS (замало)"
    grep -q "'site' => 'https://lvivimport.com'" "$NEW/api/config.php" 2>/dev/null && ok "api/config.php — для lvivimport.com" || bad "api/config.php не для lvivimport.com (заливка не з ціллю production?)"
    grep -q 'X-Robots-Tag' "$NEW/.htaccess" 2>/dev/null && bad ".htaccess містить noindex демоверсії" || ok ".htaccess без noindex"
    for k in "${KEEP[@]}"; do
        [ -d "$LIVE/$k" ] && ok "є $k" || bad "немає $k у public_html"
        [ -e "$NEW/$k" ] && bad "$k уже є в public_html_new — переносити нікуди" || true
    done
    LINK=$(readlink -f "$HOME/public_html" 2>/dev/null)
    [ "$LINK" = "$(readlink -f "$LIVE")" ] && ok "~/public_html (шлях FTP-акаунта 1С) веде в public_html домену" || bad "~/public_html веде в «$LINK» — перевірте FTP-акаунт 1С"
    LATEST=$(ls -t "$HOME"/wp-backup/lvivimport-db-*.sql.gz 2>/dev/null | head -1)
    if [ -n "$LATEST" ] && [ $(( $(date +%s) - $(stat -c %Y "$LATEST") )) -lt 86400 ]; then
        ok "свіжа копія бази: $(basename "$LATEST")"
    else
        bad "немає копії бази за останню добу — спершу bash ~/wp-backup/make-backup.sh"
    fi
    HOUR=$(date +%H)
    if [ "$HOUR" -ge 5 ] && [ "$HOUR" -lt 6 ]; then bad "05:00–06:00 — 1С саме заливає файли, зачекайте"; else ok "1С зараз не заливає (зараз $(date +%H:%M))"; fi
    echo "Диск: $(df -h "$HOME" | tail -1)"
    [ "$FAIL" -eq 0 ] && echo "Усе готово до перемикання." || echo "Є проблеми — перемикання не можна."
    return "$FAIL"
}

switch() {
    check || exit 1
    echo
    echo "Перемикання $(date '+%d.%m.%Y %H:%M:%S')"
    mv "$LIVE" "$OLD" || { echo "Не вдалося перейменувати public_html"; exit 1; }
    if ! mv "$NEW" "$LIVE"; then
        mv "$OLD" "$LIVE"
        echo "Не вдалося поставити новий сайт — WordPress повернуто"; exit 1
    fi
    for k in "${KEEP[@]}"; do
        mkdir -p "$(dirname "$LIVE/$k")" && mv "$OLD/$k" "$LIVE/$k" && echo "  перенесено $k" || echo "  ✗ НЕ перенесено $k — перенесіть вручну"
    done
    # Підтвердження Let's Encrypt для SSL-сертифіката (копія: у WordPress лишається своя)
    [ -d "$OLD/.well-known" ] && cp -a "$OLD/.well-known" "$LIVE/" && echo "  скопійовано .well-known"
    echo "Готово: lvivimport.com — новий сайт. WordPress — у $(basename "$OLD")."
    echo "Далі — кроки «Після перемикання» в docs/cutover.md (крони, FTP_DIR у GitHub, перевірка)."
}

rollback() {
    [ -d "$OLD" ] || { echo "Немає $OLD — повертати нічого"; exit 1; }
    [ -e "$NEW" ] && { echo "$NEW уже існує — перейменуйте або видаліть її вручну"; exit 1; }
    echo "Повернення WordPress $(date '+%d.%m.%Y %H:%M:%S')"
    for k in "${KEEP[@]}"; do
        if [ -d "$LIVE/$k" ] && [ ! -e "$OLD/$k" ]; then
            mkdir -p "$(dirname "$OLD/$k")" && mv "$LIVE/$k" "$OLD/$k" && echo "  повернуто $k"
        fi
    done
    mv "$LIVE" "$NEW" && mv "$OLD" "$LIVE" || { echo "Помилка під час перейменування — перевірте теки вручну"; exit 1; }
    echo "Готово: lvivimport.com — знову WordPress, новий сайт — у public_html_new."
    echo "Поверніть крони WordPress (список — у docs/cutover.md)."
}

case "${1:-}" in
    check) check ;;
    switch) switch ;;
    rollback) rollback ;;
    *) echo "bash cutover.sh check | switch | rollback"; exit 2 ;;
esac
