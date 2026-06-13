#!/bin/bash
set -e

# Pastikan script dijalankan di dalam directory network/ 
# agar docker-compose dan file konfigurasi bisa ditemukan.
cd "$(dirname "$0")"

echo "=== 1. Membersihkan environment sebelumnya ==="
docker-compose down -v
rm -rf crypto-config channel-artifacts
mkdir channel-artifacts

echo "=== 2. Generate Material Kripto (Sertifikat & Kunci) ==="
# Gunakan docker image fabric-tools agar tidak perlu install binari secara lokal
docker run --rm --user "$(id -u):$(id -g)" -v $(pwd):/data hyperledger/fabric-tools:2.5 \
    cryptogen generate --config=/data/crypto-config.yaml --output=/data/crypto-config

echo "=== 3. Generate Genesis Block & Channel Transaction ==="
docker run --rm --user "$(id -u):$(id -g)" -v $(pwd):/data -e FABRIC_CFG_PATH=/data hyperledger/fabric-tools:2.5 \
    configtxgen -profile ArtaGenesis -channelID system-channel -outputBlock /data/channel-artifacts/genesis.block

docker run --rm --user "$(id -u):$(id -g)" -v $(pwd):/data -e FABRIC_CFG_PATH=/data hyperledger/fabric-tools:2.5 \
    configtxgen -profile ArtaChannel -outputCreateChannelTx /data/channel-artifacts/arta-channel.tx -channelID arta-channel

echo "=== 4. Menyalakan Docker Network ==="
docker-compose up -d

echo "Menunggu container menyala (10 detik)..."
sleep 10

echo "=== 5. Create Channel (arta-channel) ==="
docker exec -e CORE_PEER_LOCALMSPID=PadiwangiMSP \
    -e CORE_PEER_ADDRESS=peer0.padiwangi.arta.com:7051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/padiwangi.arta.com/users/Admin@padiwangi.arta.com/msp \
    cli peer channel create -o orderer.example.com:7050 -c arta-channel -f ./channel-artifacts/arta-channel.tx

echo "=== 6. Join Channel untuk semua Peer ==="
PEERS=(
    "PadiwangiMSP:peer0.padiwangi.arta.com:7051:padiwangi.arta.com"
    "MelatiJayaMSP:peer0.melatijaya.arta.com:8051:melatijaya.arta.com"
    "SumberMakmurMSP:peer0.sumbermakmur.arta.com:9051:sumbermakmur.arta.com"
    "TirtaBersamaMSP:peer0.tirtabersama.arta.com:10051:tirtabersama.arta.com"
    "HarapanBaruMSP:peer0.harapanbaru.arta.com:11051:harapanbaru.arta.com"
    "DinasMSP:peer0.dinas.arta.com:12051:dinas.arta.com"
)

for PEER_INFO in "${PEERS[@]}"; do
    IFS=':' read -r MSP_ID PEER_HOST PORT DOMAIN <<< "$PEER_INFO"
    PEER_ADDR="${PEER_HOST}:${PORT}"
    echo "Bergabung $MSP_ID ($PEER_ADDR) ke arta-channel..."
    docker exec -e CORE_PEER_LOCALMSPID=$MSP_ID \
        -e CORE_PEER_ADDRESS=$PEER_ADDR \
        -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/$DOMAIN/users/Admin@$DOMAIN/msp \
        cli peer channel join -b arta-channel.block
done

echo "=========================================================="
echo "✅ Jaringan Hyperledger Fabric (Arta) Berhasil Dinyalakan!"
echo "=========================================================="
echo "Catatan: Chaincode belum di-deploy. Karena ini adalah multi-tenant dengan 6 organisasi, proses packaging, approving, dan committing chaincode membutuhkan skrip terpisah."
