#!/usr/bin/env bash
# Benchmark de conso ressources des containers OpenClaw.
# Usage : ./scripts/bench-openclaw.sh [N]    (N = nb de containers, défaut 5)
#
# À lancer sur une VM Hetzner de test (CPX31 ou CCX33) avec Docker installé.
# Ne provisionne PAS la config multi-spécifique — mesure le footprint de base
# d'un container OpenClaw démarré avec les mêmes flags que `lib/openclaw/manager.ts`.
#
# Output : CSV sur stdout + fichier `bench-results-<timestamp>.csv`.

set -euo pipefail

N="${1:-5}"
IMAGE="ghcr.io/openclaw/openclaw:latest"
PREFIX="bench-openclaw"
DURATION_SECS=300  # 5 min par phase
SAMPLE_INTERVAL=5  # sample docker stats toutes les 5s
NETWORK="${PREFIX}-net"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="bench-results-${TS}.csv"

echo "phase,sample_ts,container,cpu_pct,mem_mb,net_rx_kb,net_tx_kb,block_read_mb,block_write_mb" > "$OUT"

cleanup() {
  echo "[cleanup] Stopping containers..."
  for i in $(seq 1 "$N"); do
    docker rm -f "${PREFIX}-$i" >/dev/null 2>&1 || true
  done
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[setup] Pulling image..."
docker pull "$IMAGE" >/dev/null

echo "[setup] Creating network..."
docker network create "$NETWORK" >/dev/null 2>&1 || true

start_containers() {
  local count="$1"
  for i in $(seq 1 "$count"); do
    local name="${PREFIX}-$i"
    local port=$((19900 + i))
    docker run -d \
      --name "$name" \
      --network "$NETWORK" \
      -p "${port}:18789" \
      --memory 1g \
      --cpus 1 \
      --restart no \
      "$IMAGE" >/dev/null
  done
}

sample_stats() {
  local phase="$1"
  local ts="$(date +%s)"
  docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}}" \
    | grep "^${PREFIX}-" \
    | while IFS=',' read -r name cpu mem netio blkio; do
        cpu_pct="${cpu%\%}"
        mem_mb="$(echo "$mem" | awk '{print $1}' | sed -E 's/([0-9.]+)MiB/\1/;s/([0-9.]+)GiB/\1*1024/;s/([0-9.]+)KiB/\1\/1024/' | bc -l 2>/dev/null || echo 0)"
        net_rx="$(echo "$netio" | awk -F' / ' '{print $1}' | sed -E 's/([0-9.]+)kB/\1/;s/([0-9.]+)MB/\1*1024/;s/([0-9.]+)B/\1\/1024/' | bc -l 2>/dev/null || echo 0)"
        net_tx="$(echo "$netio" | awk -F' / ' '{print $2}' | sed -E 's/([0-9.]+)kB/\1/;s/([0-9.]+)MB/\1*1024/;s/([0-9.]+)B/\1\/1024/' | bc -l 2>/dev/null || echo 0)"
        blk_r="$(echo "$blkio"  | awk -F' / ' '{print $1}' | sed -E 's/([0-9.]+)MB/\1/;s/([0-9.]+)kB/\1\/1024/;s/([0-9.]+)B/\1\/1048576/' | bc -l 2>/dev/null || echo 0)"
        blk_w="$(echo "$blkio"  | awk -F' / ' '{print $2}' | sed -E 's/([0-9.]+)MB/\1/;s/([0-9.]+)kB/\1\/1024/;s/([0-9.]+)B/\1\/1048576/' | bc -l 2>/dev/null || echo 0)"
        echo "${phase},${ts},${name},${cpu_pct},${mem_mb},${net_rx},${net_tx},${blk_r},${blk_w}" >> "$OUT"
      done
}

run_phase() {
  local phase="$1"
  local seconds="$2"
  echo "[bench] Phase '${phase}' — ${seconds}s, sampling every ${SAMPLE_INTERVAL}s..."
  local elapsed=0
  while [ "$elapsed" -lt "$seconds" ]; do
    sample_stats "$phase"
    sleep "$SAMPLE_INTERVAL"
    elapsed=$((elapsed + SAMPLE_INTERVAL))
  done
}

echo "[bench] N=${N} containers, image=${IMAGE}"
echo "[bench] Output: ${OUT}"

echo "[bench] Starting 1 container for baseline..."
start_containers 1
echo "[bench] Waiting 30s for warmup..."
sleep 30
run_phase "idle-1" "$DURATION_SECS"

if [ "$N" -gt 1 ]; then
  echo "[bench] Scaling to ${N} containers..."
  start_containers $((N - 1))
  echo "[bench] Waiting 30s for warmup..."
  sleep 30
  run_phase "idle-${N}" "$DURATION_SECS"
fi

echo "[bench] Done. Results in ${OUT}."
echo
echo "=== Synthèse ==="
awk -F',' -v OFS=',' '
  NR>1 {
    n[$1]++
    cpu[$1]+=$4
    mem[$1]+=$5
  }
  END {
    print "phase,samples,cpu_avg_pct,mem_avg_mb"
    for (p in n) {
      printf "%s,%d,%.2f,%.2f\n", p, n[p], cpu[p]/n[p], mem[p]/n[p]
    }
  }
' "$OUT"
