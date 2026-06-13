#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# redeploy-credit-history.sh
#
# Redeploy chaincode credit-history v1.2.0 (sequence 4) ke arta-channel
# setelah perubahan ValidatorType (bendahara/ketua/wakil_ketua/dinas).
#
# Cara pakai:
#   1. SCP tarball ke server Fabric:
#      scp hyperledger/chaincode/credit-history/credit-history_1.2.0.tar.gz \
#          user@fabric-server:/opt/gopath/src/credit-history/
#
#   2. Jalankan script ini DI SERVER FABRIC (bukan dari laptop).
#      ./redeploy-credit-history.sh
#
#   Atau jalankan per baris secara manual.
# ---------------------------------------------------------------------------

set -euo pipefail

# ── Konfigurasi ────────────────────────────────────────────────────────────
CHANNEL_ID="arta-channel"
CC_NAME="credit-history"
CC_VERSION="1.2.0"
CC_SEQUENCE=4
CC_LABEL="${CC_NAME}_${CC_VERSION}"
CC_PACKAGE="${CC_NAME}_${CC_VERSION}.tar.gz"

# Path ke crypto material — sesuaikan dengan server Fabric kamu
CRYPTO_PATH="./crypto-config"
if [ ! -d "$CRYPTO_PATH" ]; then
  # Coba beberapa alternatif path
  if [ -d "../network/crypto-config" ]; then
    CRYPTO_PATH="../network/crypto-config"
  elif [ -d "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto" ]; then
    CRYPTO_PATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto"
  fi
fi

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Redeploy ${CC_NAME}:${CC_VERSION} (seq ${CC_SEQUENCE})"
echo "  Channel: ${CHANNEL_ID}"
echo "  Crypto:  ${CRYPTO_PATH}"
echo "═══════════════════════════════════════════════════════════════════════"

# ── Step 1: Install di setiap peer ─────────────────────────────────────────
echo ""
echo "▸ Step 1: Install chaincode di semua peer..."

declare -a ORGS=(
  "padiwangi:PadiwangiMSP:peer0.padiwangi.arta.com:7051"
  "melatijaya:MelatiJayaMSP:peer0.melatijaya.arta.com:7051"
  "sumbermakmur:SumberMakmurMSP:peer0.sumbermakmur.arta.com:7051"
  "tirtabersama:TirtaBersamaMSP:peer0.tirtabersama.arta.com:7051"
  "harapanbaru:HarapanBaruMSP:peer0.harapanbaru.arta.com:7051"
  "dinas:DinasMSP:peer0.dinas.arta.com:7051"
)

for ORG_INFO in "${ORGS[@]}"; do
  IFS=':' read -r ORG_DIR MSP_ID PEER_ADDR PEER_PORT <<< "$ORG_INFO"
  MSP_PATH="${CRYPTO_PATH}/peerOrganizations/${ORG_DIR}.arta.com/users/Admin@${ORG_DIR}.arta.com/msp"
  PEER="grpcs://${PEER_ADDR}:${PEER_PORT}"

  echo ""
  echo "  ── ${MSP_ID} (${PEER}) ──"

  if [ ! -d "$MSP_PATH" ]; then
    echo "  ⚠  MSP path tidak ditemukan: ${MSP_PATH}, SKIP"
    continue
  fi

  # Install
  CORE_PEER_ADDRESS="$PEER" \
  CORE_PEER_LOCALMSPID="$MSP_ID" \
  CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
  peer chaincode install \
    -n "$CC_NAME" \
    -v "$CC_VERSION" \
    -p "$CC_PACKAGE" \
    -l node

  echo "  ✅ Install selesai"
done

# ── Step 2: Approve untuk setiap org ───────────────────────────────────────
echo ""
echo "▸ Step 2: Approve chaincode definition..."

# Cari package ID — sesuaikan hash jika perlu
# Atau ambil dari: peer lifecycle chaincode queryinstalled
echo "  Mencari package ID..."
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>/dev/null | \
  grep "${CC_LABEL}" | \
  sed 's/^.*Package ID: //' | \
  sed 's/, Label.*$//' | \
  tr -d '[:space:]')

if [ -z "$PACKAGE_ID" ]; then
  echo "  ⚠  Package ID tidak ditemukan. Coba hitung manual..."
  # Fallback: hitung hash sendiri
  PKG_HASH=$(sha256sum "$CC_PACKAGE" | cut -d' ' -f1)
  PACKAGE_ID="${CC_LABEL}:${PKG_HASH}"
fi
echo "  Package ID: ${PACKAGE_ID}"

for ORG_INFO in "${ORGS[@]}"; do
  IFS=':' read -r ORG_DIR MSP_ID PEER_ADDR PEER_PORT <<< "$ORG_INFO"
  MSP_PATH="${CRYPTO_PATH}/peerOrganizations/${ORG_DIR}.arta.com/users/Admin@${ORG_DIR}.arta.com/msp"
  PEER="grpcs://${PEER_ADDR}:${PEER_PORT}"

  echo ""
  echo "  ── Approve: ${MSP_ID} ──"

  if [ ! -d "$MSP_PATH" ]; then
    echo "  ⚠  SKIP (MSP tidak ditemukan)"
    continue
  fi

  CORE_PEER_ADDRESS="$PEER" \
  CORE_PEER_LOCALMSPID="$MSP_ID" \
  CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
  peer lifecycle chaincode approveformyorg \
    --channelID "$CHANNEL_ID" \
    --name "$CC_NAME" \
    --version "$CC_VERSION" \
    --package-id "$PACKAGE_ID" \
    --sequence "$CC_SEQUENCE" \
    --signature-policy "AND('PadiwangiMSP.member','MelatiJayaMSP.member')"

  echo "  ✅ Approve selesai"
done

# ── Step 3: Check commit readiness ─────────────────────────────────────────
echo ""
echo "▸ Step 3: Check commit readiness..."
# Gunakan org pertama untuk check
IFS=':' read -r ORG_DIR MSP_ID PEER_ADDR PEER_PORT <<< "${ORGS[0]}"
MSP_PATH="${CRYPTO_PATH}/peerOrganizations/${ORG_DIR}.arta.com/users/Admin@${ORG_DIR}.arta.com/msp"
PEER="grpcs://${PEER_ADDR}:${PEER_PORT}"

CORE_PEER_ADDRESS="$PEER" \
CORE_PEER_LOCALMSPID="$MSP_ID" \
CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL_ID" \
  --name "$CC_NAME" \
  --version "$CC_VERSION" \
  --sequence "$CC_SEQUENCE"

# ── Step 4: Commit ke channel ──────────────────────────────────────────────
echo ""
echo "▸ Step 4: Commit chaincode definition ke channel..."

CORE_PEER_ADDRESS="$PEER" \
CORE_PEER_LOCALMSPID="$MSP_ID" \
CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
peer lifecycle chaincode commit \
  --channelID "$CHANNEL_ID" \
  --name "$CC_NAME" \
  --version "$CC_VERSION" \
  --sequence "$CC_SEQUENCE" \
  --signature-policy "AND('PadiwangiMSP.member','MelatiJayaMSP.member')"

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ Redeploy selesai!"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Verifikasi:"
echo "  peer lifecycle chaincode querycommitted --channelID arta-channel --name credit-history"
echo ""
echo "Test ValidatorDecision dengan role baru:"
echo '  curl -s -X POST http://172.16.2.205:4000/transactions \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"channelid":"arta-channel","chaincodeid":"credit-history",'
echo '          "function":"ValidatorDecision",'
echo '          "args":["APP-001",'
echo '            "{\\\"validatorId\\\":\\\"user1\\\",\\\"validatorType\\\":\\\"bendahara\\\",'
echo '              \\\"verdict\\\":\\\"approved\\\",\\\"reason\\\":\\\"layak\\\"}"]}'"'"' | jq .'
