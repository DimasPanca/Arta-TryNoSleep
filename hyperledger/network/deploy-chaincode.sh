#!/bin/bash
# Deploy/upgrade chaincode untuk semua 6 organisasi
# Jalankan dari direktori network/
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHAINCODE_DIR="$SCRIPT_DIR/../chaincode"
VERSION="${1:-1.1.0}"   # default 1.1.0 untuk upgrade

# Chaincode list
CHAINCODES=("stock-trace" "credit-history")

# Semua 6 peer
declare -A PEERS
PEERS["PadiwangiMSP"]="peer0.padiwangi.arta.com:7051:padiwangi.arta.com"
PEERS["MelatiJayaMSP"]="peer0.melatijaya.arta.com:8051:melatijaya.arta.com"
PEERS["SumberMakmurMSP"]="peer0.sumbermakmur.arta.com:9051:sumbermakmur.arta.com"
PEERS["TirtaBersamaMSP"]="peer0.tirtabersama.arta.com:10051:tirtabersama.arta.com"
PEERS["HarapanBaruMSP"]="peer0.harapanbaru.arta.com:11051:harapanbaru.arta.com"
PEERS["DinasMSP"]="peer0.dinas.arta.com:12051:dinas.arta.com"

# Endorsement policy: OR('PadiwangiMSP.member','MelatiJayaMSP.member',...,'DinasMSP.member')
ORG_LIST=("PadiwangiMSP" "MelatiJayaMSP" "SumberMakmurMSP" "TirtaBersamaMSP" "HarapanBaruMSP" "DinasMSP")
POLICY="OR("
for i in "${!ORG_LIST[@]}"; do
    if [ $i -gt 0 ]; then POLICY+=","; fi
    POLICY+="'${ORG_LIST[$i]}.member'"
done
POLICY+=")"

echo "============================================"
echo "Deploy Chaincode Upgrade v${VERSION}"
echo "Endorsement Policy: ${POLICY}"
echo "============================================"

for CC in "${CHAINCODES[@]}"; do
    echo ""
    echo "===== Processing ${CC} v${VERSION} ====="
    
    PKG_FILE="${CHAINCODE_DIR}/${CC}/${CC}_${VERSION}.tar.gz"
    if [ ! -f "$PKG_FILE" ]; then
        echo "ERROR: Package not found: $PKG_FILE"
        exit 1
    fi
    
    # 1. Copy package to CLI container
    echo "--- Copying package to cli container ---"
    docker cp "$PKG_FILE" cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/
    
    # 2. Install on all 6 peers
    for MSP_INFO in "${PEERS[@]}"; do
        IFS=':' read -r MSP_ID PEER_ADDR DOMAIN <<< "$MSP_INFO"
        PEER_PORT="${PEER_ADDR#*:}"
        PEER_HOST="${PEER_ADDR%:*}"
        
        echo "Installing ${CC} on ${MSP_ID} (${PEER_ADDR})..."
        docker exec \
            -e CORE_PEER_LOCALMSPID="${MSP_ID}" \
            -e CORE_PEER_ADDRESS="${PEER_ADDR}" \
            -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp" \
            cli peer lifecycle chaincode install "/opt/gopath/src/github.com/hyperledger/fabric/peer/${CC}_${VERSION}.tar.gz"
    done
    
    # 3. Get package ID (dari peer0.padiwangi)
    echo "--- Getting package ID for ${CC} ---"
    PKG_ID=$(docker exec \
        -e CORE_PEER_LOCALMSPID="PadiwangiMSP" \
        -e CORE_PEER_ADDRESS="peer0.padiwangi.arta.com:7051" \
        -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/padiwangi.arta.com/users/Admin@padiwangi.arta.com/msp" \
        cli peer lifecycle chaincode queryinstalled 2>&1 | grep "${CC}_${VERSION}" | awk '{print $3}' | sed 's/,//')
    
    if [ -z "$PKG_ID" ]; then
        echo "ERROR: Gagal mendapatkan package ID untuk ${CC}_${VERSION}"
        exit 1
    fi
    echo "Package ID: ${PKG_ID}"
    
    # 4. Approve by all 6 orgs
    for MSP_INFO in "${PEERS[@]}"; do
        IFS=':' read -r MSP_ID PEER_ADDR DOMAIN <<< "$MSP_INFO"
        
        echo "Approving ${CC} for ${MSP_ID}..."
        docker exec \
            -e CORE_PEER_LOCALMSPID="${MSP_ID}" \
            -e CORE_PEER_ADDRESS="${PEER_ADDR}" \
            -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp" \
            cli peer lifecycle chaincode approveformyorg \
                --channelID arta-channel \
                --name "${CC}" \
                --version "${VERSION}" \
                --package-id "${PKG_ID}" \
                --sequence 2 \
                --signature-policy "${POLICY}" \
                --waitForEvent
    done
    
    # 5. Check commit readiness
    echo "--- Checking commit readiness for ${CC} ---"
    docker exec \
        -e CORE_PEER_LOCALMSPID="PadiwangiMSP" \
        -e CORE_PEER_ADDRESS="peer0.padiwangi.arta.com:7051" \
        -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/padiwangi.arta.com/users/Admin@padiwangi.arta.com/msp" \
        cli peer lifecycle chaincode checkcommitreadiness \
            --channelID arta-channel \
            --name "${CC}" \
            --version "${VERSION}" \
            --sequence 2 \
            --signature-policy "${POLICY}" \
            --output json
    
    # 6. Commit chaincode
    echo "--- Committing ${CC} ---"
    docker exec \
        -e CORE_PEER_LOCALMSPID="PadiwangiMSP" \
        -e CORE_PEER_ADDRESS="peer0.padiwangi.arta.com:7051" \
        -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/padiwangi.arta.com/users/Admin@padiwangi.arta.com/msp" \
        cli peer lifecycle chaincode commit \
            --channelID arta-channel \
            --name "${CC}" \
            --version "${VERSION}" \
            --sequence 2 \
            --signature-policy "${POLICY}" \
            --waitForEvent \
            --peerAddresses "peer0.padiwangi.arta.com:7051" \
            --peerAddresses "peer0.melatijaya.arta.com:8051" \
            --peerAddresses "peer0.sumbermakmur.arta.com:9051" \
            --peerAddresses "peer0.tirtabersama.arta.com:10051" \
            --peerAddresses "peer0.harapanbaru.arta.com:11051" \
            --peerAddresses "peer0.dinas.arta.com:12051"
    
    echo "===== ${CC} v${VERSION} deployed successfully ====="
done

echo ""
echo "============================================"
echo "✅ Semua chaincode berhasil di-deploy!"
echo "   Versi: ${VERSION}"
echo "============================================"
