#!/bin/bash
set -e

echo "=== Mematikan Docker Network & Membersihkan Data ==="
docker-compose down -v
rm -rf crypto-config channel-artifacts
rm -f arta-channel.block

echo "✅ Jaringan Fabric berhasil dibersihkan."