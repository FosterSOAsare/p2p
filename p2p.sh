#!/usr/bin/env bash
#
# P2P Marketplace — development launcher (Linux/macOS)
#
#   ./p2p.sh          — opens the menu
#
# One menu terminal that stays open, and each service in its own window so the
# Expo QR code and the server logs stay readable. Restarting a service closes
# its window and opens a fresh one rather than stacking duplicates.
#
# The LAN IP is re-detected on every start, so switching WiFi never means
# editing a config file.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$ROOT/.p2p-run"
mkdir -p "$RUN"

SERVICES=(backend web mobile)
declare -A SERVICE_LABEL=([backend]="Backend API" [web]="Web app" [mobile]="Mobile (Expo)")
declare -A SERVICE_DIR=([backend]="$ROOT/server" [web]="$ROOT/web" [mobile]="$ROOT/mobile")
declare -A SERVICE_PORT=([backend]=8000 [web]=5173 [mobile]=8081)

C_RESET=$'\033[0m'; C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'
C_GREEN=$'\033[32m'; C_RED=$'\033[31m'; C_YELLOW=$'\033[33m'; C_CYAN=$'\033[36m'

# ── Network ──────────────────────────────────────────────────────────────────

# Current LAN IP. Prefers a real WiFi/ethernet address and ignores docker,
# loopback and link-local, so services advertise something a phone can reach.
detect_ip() {
  local ip=""
  if command -v ip >/dev/null 2>&1; then
    local rows
    rows=$(ip -4 -o addr show scope global 2>/dev/null \
      | grep -vE '\b(docker|br-|veth|virbr|tun|tap)' \
      | awk '{print $2" "$4}' | cut -d/ -f1 \
      | grep -vE ' (127\.|169\.254\.)')
    # Wireless first: the phone running Expo is on WiFi, and on a machine with
    # both, the ethernet address can be on a subnet the phone can't see.
    ip=$(echo "$rows" | awk '$1 ~ /^(wl|wlan|wlp|en0)/ {print $2; exit}')
    [ -z "$ip" ] && ip=$(echo "$rows" | awk 'NR==1 {print $2}')
  fi
  [ -z "$ip" ] && command -v hostname >/dev/null 2>&1 && \
    ip=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -vE '^(127\.|169\.254\.|172\.17\.)' | head -1)
  [ -z "$ip" ] && ip=$(ipconfig getifaddr en0 2>/dev/null)   # macOS
  echo "${ip:-127.0.0.1}"
}

# ── Terminal emulator ────────────────────────────────────────────────────────

TERM_KIND=""
detect_terminal() {
  if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ] && [ "$(uname)" != "Darwin" ]; then
    TERM_KIND="headless"; return
  fi
  for t in gnome-terminal konsole xfce4-terminal mate-terminal tilix qterminal \
           alacritty kitty wezterm terminator x-terminal-emulator xterm; do
    if command -v "$t" >/dev/null 2>&1; then TERM_KIND="$t"; return; fi
  done
  TERM_KIND="headless"
}

# Open `script` in its own window, titled `title`.
#
# We deliberately do NOT record the launcher's PID here: most emulators
# (gnome-terminal, konsole…) are thin clients that hand off to a long-running
# server and exit immediately, so that PID is dead within milliseconds. The
# runner script writes its own PID instead — see start_service.
open_window() {
  local name="$1" title="$2" script="$3"

  case "$TERM_KIND" in
    gnome-terminal) setsid gnome-terminal --title="$title" -- bash "$script" >/dev/null 2>&1 & ;;
    konsole)        setsid konsole -p tabtitle="$title" -e bash "$script" >/dev/null 2>&1 & ;;
    xfce4-terminal) setsid xfce4-terminal --title="$title" -e "bash $script" >/dev/null 2>&1 & ;;
    mate-terminal)  setsid mate-terminal --title="$title" -e "bash $script" >/dev/null 2>&1 & ;;
    tilix)          setsid tilix -t "$title" -e "bash $script" >/dev/null 2>&1 & ;;
    qterminal)      setsid qterminal -e "bash $script" >/dev/null 2>&1 & ;;
    terminator)     setsid terminator -T "$title" -e "bash $script" >/dev/null 2>&1 & ;;
    alacritty)      setsid alacritty -T "$title" -e bash "$script" >/dev/null 2>&1 & ;;
    kitty)          setsid kitty --title "$title" bash "$script" >/dev/null 2>&1 & ;;
    wezterm)        setsid wezterm start --always-new-process -- bash "$script" >/dev/null 2>&1 & ;;
    x-terminal-emulator) setsid x-terminal-emulator -T "$title" -e bash "$script" >/dev/null 2>&1 & ;;
    xterm)          setsid xterm -T "$title" -e bash "$script" >/dev/null 2>&1 & ;;
    headless)
      # No desktop session: run detached and tee to a log the user can tail.
      setsid bash "$script" > "$RUN/$name.log" 2>&1 < /dev/null &
      ;;
  esac
}

# ── Service control ──────────────────────────────────────────────────────────

is_running() {
  local pidfile="$RUN/$1.pid"
  [ -f "$pidfile" ] || return 1
  local pid; pid=$(cat "$pidfile" 2>/dev/null)
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# Anything still holding the service's port, even if we didn't start it.
port_pids() {
  command -v lsof >/dev/null 2>&1 && lsof -ti :"$1" 2>/dev/null && return
  command -v fuser >/dev/null 2>&1 && fuser "$1"/tcp 2>/dev/null
}

# Kill a process and everything it spawned, deepest first.
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child"; done
  kill -TERM "$pid" 2>/dev/null
}

stop_service() {
  local name="$1" quiet="${2:-}"
  local pidfile="$RUN/$name.pid" stopped=0
  if [ -f "$pidfile" ]; then
    local pid; pid=$(cat "$pidfile" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill_tree "$pid"
      sleep 1
      kill -KILL "$pid" 2>/dev/null
      stopped=1
    fi
    rm -f "$pidfile"
  fi
  # A previous run (or a manual npm) may still own the port.
  local leftovers; leftovers=$(port_pids "${SERVICE_PORT[$name]}")
  if [ -n "$leftovers" ]; then
    echo "$leftovers" | xargs -r kill -9 2>/dev/null
    stopped=1
  fi
  [ -z "$quiet" ] && [ "$stopped" = 1 ] && \
    printf "  %sstopped%s  %s\n" "$C_YELLOW" "$C_RESET" "${SERVICE_LABEL[$name]}"
  return 0
}

# Writes the per-service runner, then opens it in a window.
start_service() {
  local name="$1"
  local dir="${SERVICE_DIR[$name]}"

  if [ ! -d "$dir" ]; then
    printf "  %sfailed%s   %s — %s not found\n" "$C_RED" "$C_RESET" "${SERVICE_LABEL[$name]}" "$dir"
    return 1
  fi
  if [ ! -d "$dir/node_modules" ]; then
    printf "  %swarning%s  %s — dependencies missing, running npm install first\n" \
      "$C_YELLOW" "$C_RESET" "${SERVICE_LABEL[$name]}"
  fi

  local ip; ip="$IP"
  local cmd
  case "$name" in
    backend) cmd='npm run dev' ;;
    web)     cmd='npm run dev -- --host' ;;
    mobile)  cmd='npx expo start --lan' ;;
  esac

  local script="$RUN/$name.run.sh"
  cat > "$script" <<EOF
#!/usr/bin/env bash
# This script's own PID is what the launcher tracks: the terminal emulator that
# opened the window is usually a short-lived client, so its PID is useless.
# Killing this PID's tree takes npm/node with it and closes the window.
echo \$\$ > "$RUN/$name.pid"
cd "$dir" || exit 1

# Re-detected by the launcher on every start, so switching networks needs no edits.
export LAN_IP="$ip"
export EXPO_PUBLIC_API_URL="http://$ip:8000"
export VITE_API_URL="http://$ip:8000"
export REACT_NATIVE_PACKAGER_HOSTNAME="$ip"

printf '\033]0;P2P — ${SERVICE_LABEL[$name]}\007'
echo "──────────────────────────────────────────────────────────"
echo " ${SERVICE_LABEL[$name]}"
echo " dir : $dir"
echo " host: http://$ip:${SERVICE_PORT[$name]}"
echo "──────────────────────────────────────────────────────────"
echo

[ -d node_modules ] || { echo "Installing dependencies…"; npm install || exit 1; }

$cmd
code=\$?

echo
echo "──────────────────────────────────────────────────────────"
if [ \$code -ne 0 ]; then
  echo " ${SERVICE_LABEL[$name]} exited with code \$code."
  echo " Scroll up for the error. Common causes: port in use, missing .env,"
  echo " or dependencies out of date (try: cd $dir && npm install)."
else
  echo " ${SERVICE_LABEL[$name]} stopped."
fi
echo "──────────────────────────────────────────────────────────"
echo "Press Enter to close this window."
read -r
EOF
  chmod +x "$script"

  open_window "$name" "P2P — ${SERVICE_LABEL[$name]}" "$script"
  sleep 0.4
  printf "  %sstarted%s  %-14s %shttp://%s:%s%s\n" \
    "$C_GREEN" "$C_RESET" "${SERVICE_LABEL[$name]}" "$C_DIM" "$ip" "${SERVICE_PORT[$name]}" "$C_RESET"
}

restart_service() {
  local name="$1"
  if is_running "$name"; then
    printf "  restarting %s…\n" "${SERVICE_LABEL[$name]}"
    stop_service "$name" quiet
    sleep 0.5
  fi
  start_service "$name"
}

start_all()   { IP=$(detect_ip); for s in "${SERVICES[@]}"; do restart_service "$s"; done; }
stop_all()    { for s in "${SERVICES[@]}"; do stop_service "$s"; done; echo "  all service windows closed."; }
restart_all() { stop_all; sleep 1; IP=$(detect_ip); for s in "${SERVICES[@]}"; do start_service "$s"; done; }

# ── UI ───────────────────────────────────────────────────────────────────────

status_line() {
  local name="$1"
  if is_running "$name"; then
    printf "%srunning%s" "$C_GREEN" "$C_RESET"
  elif [ -n "$(port_pids "${SERVICE_PORT[$name]}")" ]; then
    printf "%sport busy%s" "$C_YELLOW" "$C_RESET"
  else
    printf "%sstopped%s" "$C_DIM" "$C_RESET"
  fi
}

menu() {
  IP=$(detect_ip)
  clear 2>/dev/null || printf '\033[2J\033[H'
  printf "%s╭──────────────────────────────────────────────────────────╮%s\n" "$C_CYAN" "$C_RESET"
  printf "%s│%s  %sP2P Marketplace — development launcher%s               %s│%s\n" \
    "$C_CYAN" "$C_RESET" "$C_BOLD" "$C_RESET" "$C_CYAN" "$C_RESET"
  printf "%s╰──────────────────────────────────────────────────────────╯%s\n" "$C_CYAN" "$C_RESET"
  printf "  LAN IP   %s%s%s   (re-detected each start)\n" "$C_BOLD" "$IP" "$C_RESET"
  printf "  Terminal %s%s%s\n\n" "$C_DIM" "$TERM_KIND" "$C_RESET"

  printf "  %-16s %-12s %s\n" "SERVICE" "STATUS" "URL"
  for s in "${SERVICES[@]}"; do
    printf "  %-16s %-22b %shttp://%s:%s%s\n" \
      "${SERVICE_LABEL[$s]}" "$(status_line "$s")" "$C_DIM" "$IP" "${SERVICE_PORT[$s]}" "$C_RESET"
  done

  cat <<MENU

  1) Start/Restart Backend
  2) Start/Restart Web
  3) Start/Restart Mobile (Expo)
  4) Start All Services
  5) Restart All Services
  6) Stop All Services
  7) Exit

MENU
}

trap 'echo; echo "  (menu closed — services keep running; choose 6 to stop them)"; exit 0' INT

detect_terminal
if [ "$TERM_KIND" = "headless" ]; then
  echo "No desktop terminal found — services will run in the background with logs in $RUN/."
  sleep 2
fi

while true; do
  menu
  read -rp "  Choose [1-7]: " choice
  echo
  case "$choice" in
    1) IP=$(detect_ip); restart_service backend ;;
    2) IP=$(detect_ip); restart_service web ;;
    3) IP=$(detect_ip); restart_service mobile ;;
    4) start_all ;;
    5) restart_all ;;
    6) stop_all ;;
    7) echo "  Leaving services running. Bye."; exit 0 ;;
    *) printf "  %sPick a number between 1 and 7.%s\n" "$C_RED" "$C_RESET" ;;
  esac
  echo
  read -rp "  Press Enter to return to the menu… " _
done
